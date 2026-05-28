import { atom, Atom } from '@tldraw/state'
import {
	ClientWebSocketAdapter,
	NetworkDiff,
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
 * Browser-environment hooks {@link CrossTabSocket} uses to react to focus
 * and visibility changes. Pulled out as an interface so tests can drive
 * them deterministically; in production we wrap `window` and `document`.
 *
 * Focus drives the **presenter** role — the tab whose cursor moves should
 * be broadcast. Only the focused tab receives pointer events, so it's the
 * only one with live cursor data to push.
 *
 * Visibility drives **leader handoff** — a hidden leader can't keep the
 * socket healthy because background-tab timer throttling clamps the ping
 * interval, so the lock should migrate to a visible tab.
 *
 * @internal
 */
export interface CrossTabBrowserEnv {
	hasFocus(): boolean
	isVisible(): boolean
	onFocus(cb: () => void): () => void
	onVisibilityChange(cb: () => void): () => void
}

/**
 * Default {@link CrossTabBrowserEnv} that wraps real `window` / `document`.
 * In non-browser environments all methods are benign no-ops.
 */
const defaultBrowserEnv: CrossTabBrowserEnv = {
	hasFocus() {
		return typeof document !== 'undefined' ? document.hasFocus() : false
	},
	isVisible() {
		if (typeof document === 'undefined') return true
		return document.visibilityState === 'visible'
	},
	onFocus(cb) {
		if (typeof window === 'undefined') return () => {}
		const handler = () => cb()
		window.addEventListener('focus', handler)
		return () => window.removeEventListener('focus', handler)
	},
	onVisibilityChange(cb) {
		if (typeof document === 'undefined') return () => {}
		const handler = () => cb()
		document.addEventListener('visibilitychange', handler)
		return () => document.removeEventListener('visibilitychange', handler)
	},
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
	| {
			_ct: 'server-broadcast-except'
			exceptTabId: string
			msg: TLSocketServerSentEvent<TLRecord>
	  }
	/**
	 * Sent on `focus` events. The pair `(claim, tabId)` orders all
	 * presenter claims in the pool — the highest tuple wins. Claims use a
	 * monotonic counter bumped past the highest seen value, so out-of-order
	 * delivery over the channel doesn't matter.
	 */
	| { _ct: 'presenter-claim'; tabId: string; claim: number }
	/**
	 * Sent on `visibilitychange` (and once on construction). Lets each tab
	 * maintain a set of currently-visible peers so the leader knows whether
	 * to release its lock when it becomes hidden.
	 */
	| { _ct: 'visibility'; tabId: string; visible: boolean }
	/**
	 * Asks all peers to broadcast their current visibility, so a tab
	 * joining mid-session can populate its peer-visibility set without
	 * waiting for the next `visibilitychange`.
	 */
	| { _ct: 'visibility-request'; fromTabId: string }

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
	 * Override the focus source (tests). Defaults to a wrapper over
	 * `window` / `document`. Pass `null` to disable focus handling — the
	 * tab will always consider itself the presenter (suitable for tests
	 * and SSR).
	 */
	browserEnv?: CrossTabBrowserEnv | null
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
 * that belong to a specific tab. The leader also synthesizes `patch`
 * events for sibling tabs on `push_result`, since the server suppresses
 * self-broadcasts for the originating session.
 *
 * When the Web Locks API is unavailable (some embedded webviews), the
 * adapter silently falls back to per-tab sockets so consumers see today's
 * behavior.
 *
 * A separate **presenter** role tracks the most-recently-focused tab (via
 * gossip on the same channel) and exposes a `$isPresenter` signal that
 * `useSync` uses to gate `presenceMode`. This keeps only one tab pushing
 * presence even when N tabs share a session, so other peers in the room
 * see a single cursor for this user.
 *
 * Leader migration is driven by visibility: a hidden tab releases the
 * lock when any peer is visible, since hidden tabs get their timers
 * throttled and can't keep the WebSocket healthy. A visible tab re-
 * requests the lock when it becomes visible again.
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
	private readonly browserEnv: CrossTabBrowserEnv | null
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
	 * Maps the leader-allocated `clientClock` to information about the
	 * original push. When the server replies with `push_result` we use this
	 * to:
	 *
	 * - Rewrite the response so the originator's `TLSyncClient` recognizes
	 *   it (clientClock unmap).
	 * - Synthesize a `patch` event for sibling tabs on `commit` actions. The
	 *   server suppresses self-broadcasts for the originating session, so
	 *   other tabs that share this session wouldn't otherwise see the
	 *   change. {@link TLSyncRoom.broadcastPatch} excludes the source
	 *   session.
	 */
	private readonly pushRouting = new Map<
		number,
		{ fromTabId: string; originalClock: number; originalDiff?: NetworkDiff<TLRecord> }
	>()
	private nextLeaderClock = 0

	/**
	 * Maps `connectRequestId` to the tab that sent the connect request. The
	 * server echoes `connectRequestId` back in its connect response;
	 * `TLSyncClient` uses it to match its in-flight handshake.
	 */
	private readonly connectRouting = new Map<string, string>()

	// === Presenter election ===

	/**
	 * Whether this tab is currently the presenter — the most-recently-
	 * focused tab in the pool. Exposed via {@link CrossTabSocket.$isPresenter}
	 * so `useSync` can gate `presenceMode` on it: only the presenter pushes
	 * cursor data, even when multiple tabs share a leader.
	 *
	 * Distinct from leader role (which owns the WebSocket). The same tab
	 * can be both, but they migrate on different signals — leader by Web
	 * Lock, presenter by focus.
	 */
	private readonly _isPresenter: Atom<boolean> = atom('cross-tab presenter', false)

	private myPresenterClaim = 0
	private highestPresenterClaim = 0
	private highestPresenterTabId = ''

	// === Visibility tracking ===

	private myIsVisible = true
	/** Last-seen visibility of each peer tab, keyed by tabId. */
	private readonly peerVisibility = new Map<string, boolean>()
	/**
	 * Whether we currently have an outstanding `navigator.locks.request`.
	 * Set just before requesting and cleared in the callback. Prevents
	 * stacking concurrent requests when visibility toggles rapidly.
	 */
	private isLockRequestPending = false

	private browserUnsubscribes: Array<() => void> = []

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
		this.browserEnv = options.browserEnv === undefined ? defaultBrowserEnv : options.browserEnv

		this.channel = channel
		this.locks = locks === NO_LOCK ? null : locks

		if (!this.channel || !this.locks) {
			// Fallback: no cross-tab coordination, so this tab is trivially the
			// presenter from useSync's perspective.
			this._isPresenter.set(true)
			this._enterFallbackMode()
			return
		}

		this.channel.addEventListener('message', this.handleChannelMessage)
		this._postChannel({ _ct: 'follower-hello', fromTabId: this.tabId })
		this._initializePresenterAndVisibility()
		this._requestLeadership()
	}

	/**
	 * Initial population of presenter + visibility state, plus subscription
	 * to browser focus / visibility events for future changes. Also asks
	 * existing peers to report their visibility so we don't sit with an
	 * empty peerVisibility map until they next toggle.
	 */
	private _initializePresenterAndVisibility() {
		const env = this.browserEnv
		if (!env) {
			// No browser env: assume we're the only tab that matters.
			this._claimPresenter()
			this.myIsVisible = true
			return
		}

		this.myIsVisible = env.isVisible()
		this._postChannel({ _ct: 'visibility', tabId: this.tabId, visible: this.myIsVisible })
		this._postChannel({ _ct: 'visibility-request', fromTabId: this.tabId })

		if (env.hasFocus()) this._claimPresenter()

		this.browserUnsubscribes.push(
			env.onFocus(() => this._onLocalFocus()),
			env.onVisibilityChange(() => this._onLocalVisibilityChange())
		)
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

	/**
	 * Reactive signal that's true when this tab is the presenter — the
	 * most-recently-focused tab in the pool. {@link useSync} reads this to
	 * gate `presenceMode`: only the presenter pushes cursor data, even
	 * when multiple tabs share a leader.
	 */
	get $isPresenter(): Atom<boolean> {
		return this._isPresenter
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

		// Unsubscribe from browser events first so we don't react during teardown.
		for (const unsub of this.browserUnsubscribes) unsub()
		this.browserUnsubscribes = []

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
		this.peerVisibility.clear()
	}

	// === Leader election ===

	private _requestLeadership() {
		assert(this.locks)
		if (this.isLockRequestPending || this.releaseLock || this.isDisposed) return
		this.isLockRequestPending = true
		const lockName = `tldraw-leader-${this.channelKey}`
		// We don't await this; the promise resolves when leadership ends.
		void this.locks.request(lockName, { mode: 'exclusive' }, () => {
			return new Promise<void>((resolve) => {
				this.isLockRequestPending = false
				if (this.isDisposed) {
					resolve()
					return
				}
				// While our request was queued, conditions may have changed —
				// e.g., we became hidden and another tab became visible.
				// Don't take the lock if we no longer want it; resolve and
				// let the next waiter through.
				if (!this._shouldWantLock()) {
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

	/**
	 * Whether this tab currently wants to hold the leader lock.
	 *
	 * - Visible tabs always want it.
	 * - Hidden tabs want it only if no other tab is visible — someone has
	 *   to hold the socket, so as a last resort, it stays here.
	 */
	private _shouldWantLock(): boolean {
		if (this.myIsVisible) return true
		for (const visible of this.peerVisibility.values()) {
			if (visible) return false
		}
		return true
	}

	/**
	 * Decide whether to release the lock (or request it) based on current
	 * own/peer visibility. Called whenever those inputs change.
	 */
	private _evaluateLockHold() {
		if (this.isDisposed) return
		// No coordination available: nothing to evaluate.
		if (!this.channel || !this.locks) return

		const want = this._shouldWantLock()
		if (this.releaseLock && !want) {
			// We hold the lock but a visible peer should take over.
			this.releaseLock()
			return
		}
		if (!this.releaseLock && want && !this.isLockRequestPending) {
			// We don't have it and want it back (e.g., visibility came back).
			this._requestLeadership()
		}
	}

	private _onLocalVisibilityChange() {
		if (this.isDisposed || !this.browserEnv) return
		const visible = this.browserEnv.isVisible()
		if (visible === this.myIsVisible) return
		this.myIsVisible = visible
		this._postChannel({ _ct: 'visibility', tabId: this.tabId, visible })
		this._evaluateLockHold()
	}

	// === Presenter election ===

	private _onLocalFocus() {
		if (this.isDisposed) return
		this._claimPresenter()
	}

	private _claimPresenter() {
		// Bump past the highest claim we've seen. The tabId tiebreaker
		// handles the rare case where two tabs make claims with the same
		// numeric value (e.g. simultaneous focus events).
		const next = Math.max(this.highestPresenterClaim, this.myPresenterClaim) + 1
		this.myPresenterClaim = next
		this.highestPresenterClaim = next
		this.highestPresenterTabId = this.tabId
		this._postChannel({ _ct: 'presenter-claim', tabId: this.tabId, claim: next })
		if (!this._isPresenter.get()) this._isPresenter.set(true)
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
				this.pushRouting.set(leaderClock, {
					fromTabId,
					originalClock: msg.clientClock,
					originalDiff: msg.diff,
				})
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
		const dispatch = this._dispatchSinglePushResult(msg)
		if (!dispatch) return
		this._deliverServerMessageTo(dispatch.toTabId, dispatch.routed)
		if (dispatch.synthesized) {
			this._deliverServerMessageToAllExcept(dispatch.toTabId, dispatch.synthesized)
		}
	}

	private _handleServerDataBatch(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'data' }>
	) {
		// Bucket inner events by destination: routed push_results per
		// originator, broadcast entries to everyone, and synthesized patches
		// for non-originator tabs.
		const routedByTab = new Map<string, typeof msg.data>()
		const broadcastInner: typeof msg.data = []
		const syntheticsByOrigin: Array<{
			exceptTabId: string
			msg: TLSocketServerSentEvent<TLRecord>
		}> = []

		for (const inner of msg.data) {
			if (inner.type !== 'push_result') {
				broadcastInner.push(inner)
				continue
			}
			const dispatch = this._dispatchSinglePushResult(inner)
			if (!dispatch) continue
			const list = routedByTab.get(dispatch.toTabId) ?? []
			list.push(dispatch.routed)
			routedByTab.set(dispatch.toTabId, list)
			if (dispatch.synthesized) {
				syntheticsByOrigin.push({
					exceptTabId: dispatch.toTabId,
					msg: dispatch.synthesized,
				})
			}
		}

		if (broadcastInner.length > 0) {
			this._deliverServerMessageToAll({ type: 'data', data: broadcastInner })
		}
		for (const [toTabId, list] of routedByTab) {
			this._deliverServerMessageTo(toTabId, { type: 'data', data: list })
		}
		for (const synth of syntheticsByOrigin) {
			this._deliverServerMessageToAllExcept(synth.exceptTabId, synth.msg)
		}
	}

	/**
	 * Process a single `push_result` into a routed response and an optional
	 * synthesized patch for siblings. Returns `null` if we have no routing
	 * entry — presumably a stale result from before a leader handoff.
	 */
	private _dispatchSinglePushResult(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>
	): {
		toTabId: string
		routed: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>
		synthesized: TLSocketServerSentEvent<TLRecord> | null
	} | null {
		const route = this.pushRouting.get(msg.clientClock)
		if (!route) return null
		this.pushRouting.delete(msg.clientClock)

		const routed = { ...msg, clientClock: route.originalClock }
		const synthesized = this._synthesizePatchForSiblings(msg, route)
		return { toTabId: route.fromTabId, routed, synthesized }
	}

	/**
	 * Build a `patch` for sibling tabs from a committed push.
	 *
	 * - `commit` → use the original push's diff verbatim.
	 * - `rebaseWithDiff` → use the server's rebased diff.
	 * - `discard` → nothing to broadcast.
	 */
	private _synthesizePatchForSiblings(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>,
		route: { fromTabId: string; originalClock: number; originalDiff?: NetworkDiff<TLRecord> }
	): TLSocketServerSentEvent<TLRecord> | null {
		let diff: NetworkDiff<TLRecord> | undefined
		if (msg.action === 'commit') {
			diff = route.originalDiff
		} else if (typeof msg.action === 'object' && 'rebaseWithDiff' in msg.action) {
			diff = msg.action.rebaseWithDiff
		}
		// Nothing to broadcast for `discard`, or commits whose original diff
		// was empty (presence-only pushes — presence records aren't
		// meaningful for siblings since each tab manages its own).
		if (!diff || Object.keys(diff).length === 0) return null
		return { type: 'patch', diff, serverClock: msg.serverClock }
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

	private _deliverServerMessageToAllExcept(
		exceptTabId: string,
		msg: TLSocketServerSentEvent<TLRecord>
	) {
		if (exceptTabId !== this.tabId) {
			this.messageListeners.forEach((cb) => cb(msg))
		}
		this._postChannel({ _ct: 'server-broadcast-except', exceptTabId, msg })
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
			case 'server-broadcast-except':
				this._onChannelServerBroadcastExcept(msg)
				return
			case 'presenter-claim':
				this._onChannelPresenterClaim(msg)
				return
			case 'visibility':
				this._onChannelVisibility(msg)
				return
			case 'visibility-request':
				this._onChannelVisibilityRequest(msg)
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

	private _onChannelServerBroadcastExcept(
		msg: Extract<CrossTabMessage, { _ct: 'server-broadcast-except' }>
	) {
		// Leaders ignore their own re-broadcasts (and the channel doesn't
		// echo to the sender anyway, but defensively).
		if (this.mode === 'leader' || this.mode === 'fallback') return
		if (msg.exceptTabId === this.tabId) return
		this.messageListeners.forEach((cb) => cb(msg.msg))
	}

	private _onChannelPresenterClaim(msg: Extract<CrossTabMessage, { _ct: 'presenter-claim' }>) {
		if (msg.tabId === this.tabId) return
		// Higher (claim, tabId) wins. The tabId tiebreaker handles
		// simultaneous claims with the same numeric value.
		const isHigher =
			msg.claim > this.highestPresenterClaim ||
			(msg.claim === this.highestPresenterClaim && msg.tabId > this.highestPresenterTabId)
		if (!isHigher) return
		this.highestPresenterClaim = msg.claim
		this.highestPresenterTabId = msg.tabId
		if (this._isPresenter.get()) this._isPresenter.set(false)
	}

	private _onChannelVisibility(msg: Extract<CrossTabMessage, { _ct: 'visibility' }>) {
		if (msg.tabId === this.tabId) return
		this.peerVisibility.set(msg.tabId, msg.visible)
		this._evaluateLockHold()
	}

	private _onChannelVisibilityRequest(
		msg: Extract<CrossTabMessage, { _ct: 'visibility-request' }>
	) {
		if (msg.fromTabId === this.tabId) return
		// A new tab is asking what we are; reply with our current visibility.
		this._postChannel({
			_ct: 'visibility',
			tabId: this.tabId,
			visible: this.myIsVisible,
		})
	}
}
