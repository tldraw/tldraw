import { atom, Atom } from '@tldraw/state'
import { TLRecord } from '@tldraw/tlschema'
import { assert, uniqueId } from '@tldraw/utils'
import { ClientWebSocketAdapter } from '../ClientWebSocketAdapter'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import {
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketStatusChangeEvent,
	TLSocketStatusListener,
} from '../TLSyncClient'
import { CrossTabBrowserEnv, defaultBrowserEnv } from './browser-env'
import { Leader } from './Leader'
import { LeaderRouter } from './LeaderRouter'
import { Presenter } from './Presenter'
import {
	BroadcastChannelLike,
	CrossTabChannel,
	createCrossTabChannel,
	CrossTabLockManager,
	CrossTabMessage,
} from './protocol'

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
	/**
	 * Override the focus/visibility source (tests). Defaults to a wrapper over
	 * `window` / `document`. Pass `null` to disable focus and visibility
	 * handling entirely — the tab will keep the lock once acquired and will
	 * always consider itself the presenter.
	 */
	browserEnv?: CrossTabBrowserEnv | null
}

/**
 * A {@link TLPersistentClientSocket} implementation that shares a single
 * WebSocket connection across same-user tabs of the same room.
 *
 * The tab that wins a Web Lock acts as the leader and owns the only real
 * WebSocket. Other tabs ("followers") send their client messages through a
 * `BroadcastChannel`; the leader forwards them to the server. Server messages
 * flow back the same way — broadcast for changes that all tabs care about,
 * routed by `clientClock` / `connectRequestId` for responses that belong to a
 * specific tab. The leader also synthesizes `patch` events for sibling tabs
 * on `push_result`, since the server suppresses self-broadcasts for the
 * originating session.
 *
 * When the Web Locks API is unavailable (some embedded webviews), the adapter
 * silently falls back to per-tab sockets so consumers see today's behavior.
 *
 * This class is the public glue: it composes internal `Leader`, `Presenter`,
 * and `LeaderRouter` modules, and implements the
 * {@link TLPersistentClientSocket} interface so `TLSyncClient` doesn't know
 * cross-tab sharing exists.
 *
 * @internal
 */
export class CrossTabSocket
	implements
		TLPersistentClientSocket<TLSocketClientSentEvent<TLRecord>, TLSocketServerSentEvent<TLRecord>>
{
	readonly tabId: string

	private readonly channelKey: string
	private readonly getUri: () => Promise<string> | string
	private readonly createSocket: (
		getUri: () => Promise<string> | string
	) => TLPersistentClientSocket<
		TLSocketClientSentEvent<TLRecord>,
		TLSocketServerSentEvent<TLRecord>
	>

	private readonly channel: CrossTabChannel | null
	private readonly leader: Leader | null
	private readonly presenter: Presenter
	private router: LeaderRouter | null = null
	private fallbackSocket: TLPersistentClientSocket<
		TLSocketClientSentEvent<TLRecord>,
		TLSocketServerSentEvent<TLRecord>
	> | null = null

	private isDisposed = false

	/**
	 * Internal status as observed by this tab. In leader mode it tracks the
	 * underlying WebSocket. In follower mode it mirrors what the leader most
	 * recently announced. Starts at `'initial'` and surfaces as `'offline'` to
	 * callers, matching {@link ClientWebSocketAdapter}.
	 */
	private readonly _connectionStatus: Atom<TLPersistentClientSocketStatus | 'initial'> = atom(
		'cross-tab socket status',
		'initial'
	)

	private readonly messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	private readonly statusListeners = new Set<TLSocketStatusListener>()
	private channelUnsubscribe: (() => void) | null = null

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

		const rawChannel = this._resolveChannel(options.channel)
		const locks = this._resolveLocks(options.locks)
		const browserEnv = options.browserEnv === undefined ? defaultBrowserEnv : options.browserEnv

		// If either channel or locks is missing we can't coordinate across
		// tabs — drop to per-tab socket behavior. The presenter is trivially
		// "this tab" in that case.
		if (!rawChannel || !locks) {
			this.channel = null
			this.leader = null
			this.presenter = new Presenter({
				channel: null,
				browserEnv,
				tabId: this.tabId,
			})
			this._enterFallbackMode()
			return
		}

		this.channel = createCrossTabChannel(rawChannel)
		this.channelUnsubscribe = this.channel.subscribe((msg) => this._onChannelMessage(msg))

		// Announce so any existing leader re-broadcasts its status to us;
		// otherwise we'd sit at 'initial' until the leader's next status change.
		this.channel.send({ _ct: 'follower-hello', fromTabId: this.tabId })

		this.presenter = new Presenter({
			channel: this.channel,
			browserEnv,
			tabId: this.tabId,
		})

		this.leader = new Leader({
			channel: this.channel,
			locks,
			browserEnv,
			lockName: `tldraw-leader-${this.channelKey}`,
			tabId: this.tabId,
			onBecomeLeader: () => this._onBecomeLeader(),
			onLoseLeadership: () => this._onLoseLeadership(),
		})
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
	): CrossTabLockManager | null {
		if (override === null) return null
		if (override !== undefined) return override
		if (typeof navigator === 'undefined') return null
		return (navigator as unknown as { locks?: CrossTabLockManager }).locks ?? null
	}

	// === Public API: TLPersistentClientSocket ===

	// eslint-disable-next-line tldraw/no-setter-getter
	get connectionStatus(): TLPersistentClientSocketStatus {
		const status = this._connectionStatus.get()
		return status === 'initial' ? 'offline' : status
	}

	/**
	 * Reactive signal that's true when this tab is the presenter — the
	 * most-recently-focused tab in the pool. `useSync` reads this to gate
	 * `presenceMode`: only the presenter pushes cursor data, even when
	 * multiple tabs share a leader.
	 */
	get $isPresenter(): Atom<boolean> {
		return this.presenter.$isPresenter
	}

	/**
	 * Current role: `leader` (owns the WebSocket), `follower` (relays via
	 * channel), or `fallback` (no cross-tab coordination available, so owns
	 * its own WebSocket independently). Intended for introspection and tests
	 * — application code should rely on the
	 * {@link TLPersistentClientSocket | TLPersistentClientSocket} interface.
	 */
	// eslint-disable-next-line tldraw/no-setter-getter
	get mode(): 'leader' | 'follower' | 'fallback' {
		if (this.fallbackSocket) return 'fallback'
		if (this.router) return 'leader'
		return 'follower'
	}

	sendMessage(msg: TLSocketClientSentEvent<TLRecord>): void {
		assert(!this.isDisposed, 'Tried to send message on a disposed CrossTabSocket')
		if (this.fallbackSocket) {
			this.fallbackSocket.sendMessage(msg)
			return
		}
		if (this.router) {
			this.router.sendLocalClientMessage(msg)
			return
		}
		// Follower mode: send via channel for the leader to pick up.
		this.channel?.send({ _ct: 'client', fromTabId: this.tabId, msg })
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
		this.fallbackSocket?.restart()
		this.router?.restart()
	}

	close(): void {
		if (this.isDisposed) return
		this.isDisposed = true

		this.router?.close()
		this.router = null
		this.fallbackSocket?.close()
		this.fallbackSocket = null

		this.channelUnsubscribe?.()
		this.channelUnsubscribe = null
		this.leader?.close()
		this.presenter.close()
		this.channel?.close()

		this.messageListeners.clear()
		this.statusListeners.clear()
	}

	// === Leader / fallback wiring ===

	private _onBecomeLeader() {
		if (this.isDisposed || !this.channel) return
		const ws = this.createSocket(this.getUri)
		this.router = new LeaderRouter({
			underlyingSocket: ws,
			channel: this.channel,
			tabId: this.tabId,
			onLocalServerMessage: (msg) => this._deliverToLocalListeners(msg),
			onStatusChange: (ev) => this._applyStatus(ev),
		})
	}

	private _onLoseLeadership() {
		if (this.isDisposed) return
		this.router?.close()
		this.router = null
		// Followers expect to keep seeing leader-status events from whoever
		// holds the lock next; our own status atom will catch up via the
		// leader-status channel message below.
	}

	private _enterFallbackMode() {
		const ws = this.createSocket(this.getUri)
		this.fallbackSocket = ws

		ws.onReceiveMessage((msg) => this._deliverToLocalListeners(msg))
		ws.onStatusChange((ev) => this._applyStatus(ev))

		// Surface the initial status.
		this._applyStatus(toStatusChangeEvent(ws.connectionStatus))
	}

	// === Status / message delivery ===

	private _applyStatus(ev: TLSocketStatusChangeEvent) {
		this._connectionStatus.set(ev.status)
		this.statusListeners.forEach((cb) => cb(ev))
	}

	private _deliverToLocalListeners(msg: TLSocketServerSentEvent<TLRecord>) {
		this.messageListeners.forEach((cb) => cb(msg))
	}

	// === Channel: follower-side dispatch ===

	private _onChannelMessage(msg: CrossTabMessage) {
		if (this.isDisposed) return
		switch (msg._ct) {
			case 'leader-status':
				this._onChannelLeaderStatus(msg)
				return
			case 'server-all':
				// Leaders ignore their own re-broadcast echoes — but the channel
				// doesn't echo to the sender so this is just defensive.
				if (this.router) return
				this._deliverToLocalListeners(msg.msg)
				return
			case 'server-to':
				if (msg.toTabId !== this.tabId) return
				this._deliverToLocalListeners(msg.msg)
				return
			case 'server-broadcast-except':
				if (this.router) return
				if (msg.exceptTabId === this.tabId) return
				this._deliverToLocalListeners(msg.msg)
				return
			default:
				return
		}
	}

	private _onChannelLeaderStatus(msg: Extract<CrossTabMessage, { _ct: 'leader-status' }>) {
		// Leaders / fallback own their own status from the underlying WS.
		if (this.router || this.fallbackSocket) return
		const ev: TLSocketStatusChangeEvent =
			msg.status === 'error'
				? { status: 'error', reason: msg.reason ?? 'unknown' }
				: { status: msg.status }
		this._applyStatus(ev)
	}
}

function toStatusChangeEvent(status: TLPersistentClientSocketStatus): TLSocketStatusChangeEvent {
	if (status === 'error') return { status: 'error', reason: 'unknown' }
	return { status }
}
