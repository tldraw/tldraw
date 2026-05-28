import { atom, Atom } from '@tldraw/state'
import {
	ClientWebSocketAdapter,
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketClientSentEvent,
	TLSocketServerSentEvent,
	TLSocketStatusChangeEvent,
	TLSocketStatusListener,
} from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'
import { assert, uniqueId } from '@tldraw/utils'

/**
 * Subset of {@link !BroadcastChannel | BroadcastChannel} used by
 * {@link CrossTabSocket}. Defined as an interface so tests can inject a mock
 * that gossips between in-process instances.
 *
 * @internal
 */
export interface BroadcastChannelLike {
	postMessage(msg: any): void
	close(): void
	addEventListener(type: 'message', handler: (ev: MessageEvent) => void): void
	removeEventListener(type: 'message', handler: (ev: MessageEvent) => void): void
}

/**
 * Subset of `navigator.locks` used by {@link CrossTabSocket}.
 *
 * @internal
 */
export interface CrossTabLockManager {
	request(
		name: string,
		options: { mode: 'exclusive'; signal?: AbortSignal },
		callback: () => Promise<unknown>
	): Promise<unknown>
}

/**
 * Internal channel message envelope. The `_ct` tag namespaces our messages so
 * a future user of the same channel doesn't accidentally trip our handlers.
 */
type CrossTabMessage =
	| { _ct: 'leader-status'; status: TLPersistentClientSocketStatus; reason?: string }
	| { _ct: 'follower-hello'; fromTabId: string }
	| { _ct: 'client'; fromTabId: string; msg: TLSocketClientSentEvent<TLRecord> }
	| { _ct: 'server-all'; msg: TLSocketServerSentEvent<TLRecord> }
	| { _ct: 'server-to'; toTabId: string; msg: TLSocketServerSentEvent<TLRecord> }

/** @internal */
export interface CrossTabSocketOptions {
	/**
	 * Stable identifier for the room scope. Used to derive the
	 * `BroadcastChannel` name and the Web Lock name, so different rooms never
	 * elect a shared leader.
	 */
	channelKey: string
	/** Override the channel implementation (tests). */
	channel?: BroadcastChannelLike | null
	/** Override the lock manager (tests). Pass `null` to force fallback mode. */
	locks?: CrossTabLockManager | null
	/**
	 * Override the underlying socket factory (tests). Defaults to
	 * {@link ClientWebSocketAdapter}.
	 */
	createSocket?: (
		getUri: () => Promise<string> | string
	) => TLPersistentClientSocket<
		TLSocketClientSentEvent<TLRecord>,
		TLSocketServerSentEvent<TLRecord>
	>
	/** Override the tab identifier (tests). */
	tabId?: string
}

const NO_LOCK = Symbol('CrossTabSocket: no lock manager')

function toStatusChangeEvent(status: TLPersistentClientSocketStatus): TLSocketStatusChangeEvent {
	if (status === 'error') return { status: 'error', reason: 'unknown' }
	return { status }
}

/**
 * A {@link TLPersistentClientSocket} implementation that shares a single
 * WebSocket connection across same-user tabs of the same room.
 *
 * The tab that wins a Web Lock acts as the leader and owns the only real
 * WebSocket. Other tabs ("followers") send their client messages through a
 * `BroadcastChannel`; the leader forwards them to the server. Server
 * messages flow back the same way — broadcast for changes that all tabs
 * care about, routed by `clientClock` / `connectRequestId` for responses
 * that belong to a specific tab.
 *
 * When the Web Locks API is unavailable (some embedded webviews), the
 * adapter silently falls back to per-tab sockets so consumers see today's
 * behavior.
 *
 * Known gaps in this cut (addressed in follow-up commits):
 *
 * - **Same-pool sibling state drift.** The server suppresses self-broadcasts
 *   for the originating session, so a commit from one of our tabs doesn't
 *   produce a `patch` for the others. They diverge until reconnect.
 * - **Presence races.** Every tab in the pool pushes its own cursor through
 *   the shared session, racing the single `instance_presence` row.
 * - **Hidden-leader throttling.** A backgrounded leader's timers get
 *   clamped, the server hangs up. No automatic handoff yet.
 *
 * @internal
 */
export class CrossTabSocket
	implements
		TLPersistentClientSocket<TLSocketClientSentEvent<TLRecord>, TLSocketServerSentEvent<TLRecord>>
{
	readonly tabId: string

	private readonly channelKey: string
	private readonly channel: BroadcastChannelLike | null
	private readonly locks: CrossTabLockManager | null
	private readonly getUri: () => Promise<string> | string
	private readonly createSocket: (
		getUri: () => Promise<string> | string
	) => TLPersistentClientSocket<
		TLSocketClientSentEvent<TLRecord>,
		TLSocketServerSentEvent<TLRecord>
	>

	private isDisposed = false

	private readonly _connectionStatus: Atom<TLPersistentClientSocketStatus | 'initial'> = atom(
		'cross-tab socket status',
		'initial'
	)

	private mode: 'pending' | 'leader' | 'follower' | 'fallback' = 'pending'
	private leaderSocket: TLPersistentClientSocket<
		TLSocketClientSentEvent<TLRecord>,
		TLSocketServerSentEvent<TLRecord>
	> | null = null
	private releaseLock: (() => void) | null = null

	private lastBroadcastStatus: { status: TLPersistentClientSocketStatus; reason?: string } | null =
		null

	private readonly messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	private readonly statusListeners = new Set<TLSocketStatusListener>()

	private readonly handleChannelMessage = (ev: MessageEvent) =>
		this._handleChannelMessage(ev.data as CrossTabMessage)

	// === Leader-side routing tables ===

	/**
	 * Maps the leader-allocated `clientClock` to the original sender. Every
	 * tab's `TLSyncClient` numbers its own push requests independently, so
	 * `clientClock=0` from one tab and `clientClock=0` from another would
	 * collide on the server. The leader allocates a fresh monotonic clock
	 * for each forwarded push and uses this table to rewrite the matching
	 * `push_result` back to the originator's original clientClock.
	 */
	private readonly pushRouting = new Map<
		number,
		{ fromTabId: string; originalClock: number }
	>()
	private nextLeaderClock = 0

	/**
	 * Maps `connectRequestId` to the tab that sent the connect request. The
	 * server echoes `connectRequestId` back in its connect response;
	 * `TLSyncClient` uses it to match its in-flight handshake.
	 */
	private readonly connectRouting = new Map<string, string>()

	constructor(getUri: () => Promise<string> | string, options: CrossTabSocketOptions) {
		this.getUri = getUri
		this.tabId = options.tabId ?? uniqueId()
		this.channelKey = options.channelKey
		this.createSocket =
			options.createSocket ??
			((uri) =>
				new ClientWebSocketAdapter(uri) as TLPersistentClientSocket<
					TLSocketClientSentEvent<TLRecord>,
					TLSocketServerSentEvent<TLRecord>
				>)

		const channel = this._resolveChannel(options.channel)
		const locks = this._resolveLocks(options.locks)

		this.channel = channel
		this.locks = locks === NO_LOCK ? null : locks

		if (!this.channel || !this.locks) {
			this._enterFallbackMode()
			return
		}

		this.channel.addEventListener('message', this.handleChannelMessage)
		this._postChannel({ _ct: 'follower-hello', fromTabId: this.tabId })
		this._requestLeadership()
	}

	private _resolveChannel(
		override: BroadcastChannelLike | null | undefined
	): BroadcastChannelLike | null {
		if (override !== undefined) return override
		if (typeof BroadcastChannel === 'undefined') return null
		return new BroadcastChannel(`tldraw-room-${this.channelKey}`) as BroadcastChannelLike
	}

	private _resolveLocks(
		override: CrossTabLockManager | null | undefined
	): CrossTabLockManager | null | typeof NO_LOCK {
		if (override === null) return NO_LOCK
		if (override !== undefined) return override
		if (typeof navigator === 'undefined') return null
		const locks = (navigator as unknown as { locks?: CrossTabLockManager }).locks
		return locks ?? null
	}

	// === Public API ===

	// eslint-disable-next-line tldraw/no-setter-getter
	get connectionStatus(): TLPersistentClientSocketStatus {
		const status = this._connectionStatus.get()
		return status === 'initial' ? 'offline' : status
	}

	sendMessage(msg: TLSocketClientSentEvent<TLRecord>): void {
		assert(!this.isDisposed, 'Tried to send message on a disposed CrossTabSocket')
		this._handleClientMessage(this.tabId, msg)
	}

	onReceiveMessage(cb: (val: TLSocketServerSentEvent<TLRecord>) => void): () => void {
		assert(!this.isDisposed, 'Tried to add message listener on a disposed CrossTabSocket')
		this.messageListeners.add(cb)
		return () => {
			this.messageListeners.delete(cb)
		}
	}

	onStatusChange(cb: TLSocketStatusListener): () => void {
		assert(!this.isDisposed, 'Tried to add status listener on a disposed CrossTabSocket')
		this.statusListeners.add(cb)
		return () => {
			this.statusListeners.delete(cb)
		}
	}

	restart(): void {
		if (this.isDisposed) return
		this.leaderSocket?.restart()
	}

	close(): void {
		if (this.isDisposed) return
		this.isDisposed = true

		this.leaderSocket?.close()
		this.leaderSocket = null

		this.channel?.removeEventListener('message', this.handleChannelMessage)
		this.channel?.close()

		// Releasing resolves the lock callback's promise, which lets the next
		// waiter (some peer in another tab) acquire it.
		this.releaseLock?.()
		this.releaseLock = null

		this.messageListeners.clear()
		this.statusListeners.clear()
		this.pushRouting.clear()
		this.connectRouting.clear()
	}

	// === Leader election ===

	private _requestLeadership() {
		assert(this.locks)
		const lockName = `tldraw-leader-${this.channelKey}`
		// We don't await this; the promise resolves when leadership ends.
		void this.locks.request(lockName, { mode: 'exclusive' }, () => {
			return new Promise<void>((resolve) => {
				if (this.isDisposed) {
					resolve()
					return
				}
				this.releaseLock = () => {
					this.releaseLock = null
					resolve()
				}
				this._enterLeaderMode()
			})
		})
	}

	private _enterLeaderMode() {
		this.mode = 'leader'
		const ws = this.createSocket(this.getUri)
		this.leaderSocket = ws

		ws.onReceiveMessage((msg) => this._handleServerMessage(msg))
		ws.onStatusChange((ev) => this._handleLeaderStatusChange(ev))

		const initialEvent = toStatusChangeEvent(ws.connectionStatus)
		this._applyLocalStatus(initialEvent)
		this._broadcastStatus(initialEvent)
	}

	private _enterFallbackMode() {
		this.mode = 'fallback'
		const ws = this.createSocket(this.getUri)
		this.leaderSocket = ws

		ws.onReceiveMessage((msg) => {
			this.messageListeners.forEach((cb) => cb(msg))
		})
		ws.onStatusChange((ev) => this._applyLocalStatus(ev))

		this._applyLocalStatus(toStatusChangeEvent(ws.connectionStatus))
	}

	// === Outbound: client → server ===

	/**
	 * Handle a client-sent message that needs to reach the server. Called for
	 * both the local tab's `sendMessage` and follower-sent messages received
	 * over the channel.
	 */
	private _handleClientMessage(fromTabId: string, msg: TLSocketClientSentEvent<TLRecord>) {
		if (this.mode === 'leader' || this.mode === 'fallback') {
			this._forwardClientMessageToServer(fromTabId, msg)
		} else {
			// Follower / pending: forward via channel for the leader to pick up.
			this._postChannel({ _ct: 'client', fromTabId, msg })
		}
	}

	/**
	 * Forward a client message to the underlying WebSocket, remapping clocks /
	 * tracking routing info as needed so we can deliver the server's response
	 * back to the right tab.
	 */
	private _forwardClientMessageToServer(
		fromTabId: string,
		msg: TLSocketClientSentEvent<TLRecord>
	) {
		assert(this.leaderSocket)

		switch (msg.type) {
			case 'push': {
				const leaderClock = this.nextLeaderClock++
				this.pushRouting.set(leaderClock, { fromTabId, originalClock: msg.clientClock })
				this.leaderSocket.sendMessage({ ...msg, clientClock: leaderClock })
				return
			}
			case 'connect': {
				this.connectRouting.set(msg.connectRequestId, fromTabId)
				this.leaderSocket.sendMessage(msg)
				return
			}
			default:
				// ping, custom, ...: no routing state needed.
				this.leaderSocket.sendMessage(msg)
				return
		}
	}

	// === Inbound: server → tabs ===

	/**
	 * Dispatch a server-sent message to the right recipients. Most messages
	 * are room-wide and broadcast to every tab; a few are routed by an id we
	 * remembered when forwarding the corresponding client message:
	 *
	 * - `connect` → routed to the tab whose `connectRequestId` matches.
	 * - `push_result` → routed back to the originating tab (with their
	 *   original `clientClock`).
	 * - `data` → split: routed entries are dispatched per-tab, broadcast
	 *   entries go to all tabs.
	 */
	private _handleServerMessage(msg: TLSocketServerSentEvent<TLRecord>) {
		switch (msg.type) {
			case 'connect':
				this._handleServerConnect(msg)
				return
			case 'push_result':
				this._handleServerPushResult(msg)
				return
			case 'data':
				this._handleServerDataBatch(msg)
				return
			default:
				this._deliverServerMessageToAll(msg)
				return
		}
	}

	private _handleServerConnect(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'connect' }>
	) {
		const tabId = this.connectRouting.get(msg.connectRequestId)
		if (!tabId) {
			// We never saw a connect with this id — probably a race during
			// leader handoff. Broadcast as a safe default; tabs whose
			// connectRequestId doesn't match will ignore it inside TLSyncClient.
			this._deliverServerMessageToAll(msg)
			return
		}
		this.connectRouting.delete(msg.connectRequestId)
		this._deliverServerMessageTo(tabId, msg)
	}

	private _handleServerPushResult(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>
	) {
		const route = this.pushRouting.get(msg.clientClock)
		if (!route) {
			// Stale result (lost mapping across leader handoff?). Drop quietly.
			return
		}
		this.pushRouting.delete(msg.clientClock)
		this._deliverServerMessageTo(route.fromTabId, { ...msg, clientClock: route.originalClock })
	}

	private _handleServerDataBatch(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'data' }>
	) {
		// Bucket inner events by destination: routed push_results per
		// originator, broadcast entries to everyone.
		const routedByTab = new Map<string, typeof msg.data>()
		const broadcastInner: typeof msg.data = []

		for (const inner of msg.data) {
			if (inner.type !== 'push_result') {
				broadcastInner.push(inner)
				continue
			}
			const route = this.pushRouting.get(inner.clientClock)
			if (!route) continue
			this.pushRouting.delete(inner.clientClock)
			const list = routedByTab.get(route.fromTabId) ?? []
			list.push({ ...inner, clientClock: route.originalClock })
			routedByTab.set(route.fromTabId, list)
		}

		if (broadcastInner.length > 0) {
			this._deliverServerMessageToAll({ type: 'data', data: broadcastInner })
		}
		for (const [toTabId, list] of routedByTab) {
			this._deliverServerMessageTo(toTabId, { type: 'data', data: list })
		}
	}

	private _deliverServerMessageToAll(msg: TLSocketServerSentEvent<TLRecord>) {
		// Local first so the leader's own TLSyncClient processes it in the
		// same order as other tabs (which see it via the channel post below).
		this.messageListeners.forEach((cb) => cb(msg))
		this._postChannel({ _ct: 'server-all', msg })
	}

	private _deliverServerMessageTo(toTabId: string, msg: TLSocketServerSentEvent<TLRecord>) {
		if (toTabId === this.tabId) {
			this.messageListeners.forEach((cb) => cb(msg))
		} else {
			this._postChannel({ _ct: 'server-to', toTabId, msg })
		}
	}

	// === Status propagation ===

	private _handleLeaderStatusChange(ev: TLSocketStatusChangeEvent) {
		this._applyLocalStatus(ev)
		this._broadcastStatus(ev)
	}

	private _applyLocalStatus(ev: TLSocketStatusChangeEvent) {
		this._connectionStatus.set(ev.status)
		this.statusListeners.forEach((cb) => cb(ev))
	}

	private _broadcastStatus(ev: TLSocketStatusChangeEvent) {
		const status = ev.status
		const reason = ev.status === 'error' ? ev.reason : undefined
		this.lastBroadcastStatus = { status, reason }
		this._postChannel({ _ct: 'leader-status', status, reason })
	}

	// === Channel handling ===

	private _postChannel(msg: CrossTabMessage) {
		if (!this.channel) return
		this.channel.postMessage(msg)
	}

	private _handleChannelMessage(msg: CrossTabMessage) {
		if (this.isDisposed) return
		if (!msg || typeof msg !== 'object' || !('_ct' in msg)) return

		switch (msg._ct) {
			case 'leader-status':
				this._onChannelLeaderStatus(msg)
				return
			case 'follower-hello':
				this._onChannelFollowerHello(msg)
				return
			case 'client':
				this._onChannelClientMessage(msg)
				return
			case 'server-all':
				this._onChannelServerAll(msg)
				return
			case 'server-to':
				this._onChannelServerTo(msg)
				return
		}
	}

	private _onChannelLeaderStatus(msg: Extract<CrossTabMessage, { _ct: 'leader-status' }>) {
		if (this.mode === 'leader' || this.mode === 'fallback') return
		this.mode = 'follower'
		const ev: TLSocketStatusChangeEvent =
			msg.status === 'error'
				? { status: 'error', reason: msg.reason ?? 'unknown' }
				: { status: msg.status }
		this._applyLocalStatus(ev)
	}

	private _onChannelFollowerHello(msg: Extract<CrossTabMessage, { _ct: 'follower-hello' }>) {
		if (this.mode !== 'leader') return
		if (msg.fromTabId === this.tabId) return
		// Re-broadcast current status so the new tab can leave 'initial'
		// without waiting for the next status change.
		if (this.lastBroadcastStatus) {
			this._postChannel({
				_ct: 'leader-status',
				status: this.lastBroadcastStatus.status,
				reason: this.lastBroadcastStatus.reason,
			})
		}
	}

	private _onChannelClientMessage(msg: Extract<CrossTabMessage, { _ct: 'client' }>) {
		if (this.mode !== 'leader') return
		if (msg.fromTabId === this.tabId) return
		this._forwardClientMessageToServer(msg.fromTabId, msg.msg)
	}

	private _onChannelServerAll(msg: Extract<CrossTabMessage, { _ct: 'server-all' }>) {
		if (this.mode === 'leader' || this.mode === 'fallback') return
		this.messageListeners.forEach((cb) => cb(msg.msg))
	}

	private _onChannelServerTo(msg: Extract<CrossTabMessage, { _ct: 'server-to' }>) {
		if (msg.toTabId !== this.tabId) return
		this.messageListeners.forEach((cb) => cb(msg.msg))
	}
}
