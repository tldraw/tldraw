import { atom, Atom } from '@tldraw/state'
import { TLRecord } from '@tldraw/tlschema'
import { assert, uniqueId } from '@tldraw/utils'
import { ClientWebSocketAdapter } from '../ClientWebSocketAdapter'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import {
	TLPersistentClientSocket,
	TLSocketStatusChangeEvent,
	TLSocketStatusListener,
} from '../TLSyncClient'
import { createCrossTabChannel } from './createCrossTabChannel'
import { createFollowerReceiver, FollowerReceiver } from './createFollowerReceiver'
import { createLeader, Leader } from './createLeader'
import { createLeaderRouter, LeaderRouter, toStatusChangeEvent } from './createLeaderRouter'
import { createPresenter, Presenter } from './createPresenter'
import { defaultBrowserContext } from './defaultBrowserContext'
import {
	BroadcastChannelLike,
	BrowserContext,
	CrossTabChannel,
	CrossTabLockManager,
} from './types'

/** @internal */
export type UnderlyingSocket = TLPersistentClientSocket<
	TLSocketClientSentEvent<TLRecord>,
	TLSocketServerSentEvent<TLRecord>
>

/** @internal */
export interface CrossTabSocketOptions {
	/**
	 * Stable identifier for the room scope. Used to derive the
	 * `BroadcastChannel` name and the Web Lock name, so different rooms
	 * never elect a shared leader.
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
	createSocket?: (getUri: () => Promise<string> | string) => UnderlyingSocket
	/** Override the tab identifier (tests). */
	tabId?: string
	/**
	 * Override the focus/visibility source (tests). Defaults to a wrapper
	 * over `window` / `document`. Pass `null` to disable focus and
	 * visibility handling entirely — the tab will keep the lock once
	 * acquired and will always consider itself the presenter.
	 */
	browserContext?: BrowserContext | null
}

/**
 * What {@link createCrossTabSocket} returns.
 *
 * @internal
 */
export interface CrossTabSocket
	extends TLPersistentClientSocket<
		TLSocketClientSentEvent<TLRecord>,
		TLSocketServerSentEvent<TLRecord>
	> {
	readonly tabId: string
	/**
	 * Reactive signal that's true when this tab is the presenter — the
	 * most-recently-focused tab in the pool. `useSync` reads this to gate
	 * `presenceMode`: only the presenter pushes cursor data, even when
	 * multiple tabs share a leader.
	 */
	readonly $isPresenter: Atom<boolean>
	/**
	 * Current role: `leader` (owns the WebSocket), `follower` (relays via
	 * channel), or `fallback` (no cross-tab coordination available, so
	 * owns its own WebSocket independently). Intended for introspection
	 * and tests — application code should rely on the
	 * {@link TLPersistentClientSocket} interface.
	 */
	readonly mode: 'leader' | 'follower' | 'fallback'
}

/**
 * Create a {@link TLPersistentClientSocket} that shares a single WebSocket
 * connection across same-user tabs of the same room.
 *
 * The tab that wins a Web Lock acts as the leader and owns the only real
 * WebSocket. Other tabs ("followers") send their client messages through
 * a `BroadcastChannel`; the leader forwards them to the server. Server
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
 * Composes four internal pieces:
 *
 * - `createPresenter` — focus-driven $isPresenter signal.
 * - `createLeader` — Web Lock + visibility-driven want-lock.
 * - `createLeaderRouter` — clientClock remap + sibling-patch synthesis +
 *   connect routing (instantiated only while this tab is leader).
 * - `createFollowerReceiver` — channel dispatch for follower-bound
 *   messages.
 *
 * @internal
 */
export function createCrossTabSocket(
	getUri: () => Promise<string> | string,
	options: CrossTabSocketOptions
): CrossTabSocket {
	const tabId = options.tabId ?? uniqueId()
	const channelKey = options.channelKey
	const createUnderlyingSocket =
		options.createSocket ??
		((uri) => new ClientWebSocketAdapter(uri) as UnderlyingSocket)

	const rawChannel = resolveChannel(options.channel, channelKey)
	const locks = resolveLocks(options.locks)
	const browserContext =
		options.browserContext === undefined ? defaultBrowserContext : options.browserContext

	let isDisposed = false

	// Status surfaced to callers. In leader/fallback mode it tracks the
	// underlying WS; in follower mode it mirrors what the leader announced.
	// 'initial' surfaces as 'offline', matching ClientWebSocketAdapter.
	const $connectionStatus = atom<'initial' | 'online' | 'offline' | 'error'>(
		'cross-tab socket status',
		'initial'
	)

	const messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	const statusListeners = new Set<TLSocketStatusListener>()

	function deliverToLocal(msg: TLSocketServerSentEvent<TLRecord>) {
		messageListeners.forEach((cb) => cb(msg))
	}

	function applyStatus(ev: TLSocketStatusChangeEvent) {
		$connectionStatus.set(ev.status)
		statusListeners.forEach((cb) => cb(ev))
	}

	let router: LeaderRouter | null = null
	let fallbackSocket: UnderlyingSocket | null = null

	function isLeaderOrFallback(): boolean {
		return router !== null || fallbackSocket !== null
	}

	function getMode(): 'leader' | 'follower' | 'fallback' {
		if (fallbackSocket) return 'fallback'
		if (router) return 'leader'
		return 'follower'
	}

	let presenter: Presenter
	let leader: Leader | null = null
	let followerReceiver: FollowerReceiver | null = null
	let channel: CrossTabChannel | null = null

	if (!rawChannel || !locks) {
		// No channel or no Web Locks: act as a regular per-tab socket. The
		// presenter is trivially "this tab".
		presenter = createPresenter({ channel: null, browserContext, tabId })
		const ws = createUnderlyingSocket(getUri)
		fallbackSocket = ws
		ws.onReceiveMessage(deliverToLocal)
		ws.onStatusChange(applyStatus)
		applyStatus(toStatusChangeEvent(ws.connectionStatus))
	} else {
		channel = createCrossTabChannel(rawChannel)

		// Follower-side dispatch. Subscribed for the lifetime of this
		// socket; it gates itself on isLeaderOrFallback() for messages
		// that leaders/fallback should ignore.
		followerReceiver = createFollowerReceiver({
			tabId,
			channel,
			isLeaderOrFallback,
			deliverToLocal,
			applyStatus,
		})

		// Announce so any existing leader re-broadcasts its status to us;
		// otherwise we'd sit at 'initial' until the leader's next status
		// change.
		channel.send({ _ct: 'follower-hello', fromTabId: tabId })

		presenter = createPresenter({ channel, browserContext, tabId })

		leader = createLeader({
			channel,
			locks,
			browserContext,
			lockName: `tldraw-leader-${channelKey}`,
			tabId,
			onBecomeLeader: () => {
				if (isDisposed || !channel) return
				const ws = createUnderlyingSocket(getUri)
				router = createLeaderRouter({
					underlyingSocket: ws,
					channel,
					tabId,
					onLocalServerMessage: deliverToLocal,
					onStatusChange: applyStatus,
				})
			},
			onLoseLeadership: () => {
				if (isDisposed) return
				router?.close()
				router = null
				// Followers expect to keep seeing leader-status events from
				// whoever holds the lock next; our own status atom will catch
				// up via the leader-status channel message.
			},
		})
	}

	// --- public surface ---

	function sendMessage(msg: TLSocketClientSentEvent<TLRecord>) {
		assert(!isDisposed, 'Tried to send message on a disposed CrossTabSocket')
		if (fallbackSocket) {
			fallbackSocket.sendMessage(msg)
			return
		}
		if (router) {
			router.sendLocalClientMessage(msg)
			return
		}
		// Follower mode: send via channel for the leader to pick up.
		channel?.send({ _ct: 'client', fromTabId: tabId, msg })
	}

	function onReceiveMessage(cb: (val: TLSocketServerSentEvent<TLRecord>) => void) {
		assert(!isDisposed, 'Tried to add message listener on a disposed CrossTabSocket')
		messageListeners.add(cb)
		return () => {
			messageListeners.delete(cb)
		}
	}

	function onStatusChange(cb: TLSocketStatusListener) {
		assert(!isDisposed, 'Tried to add status listener on a disposed CrossTabSocket')
		statusListeners.add(cb)
		return () => {
			statusListeners.delete(cb)
		}
	}

	function restart() {
		if (isDisposed) return
		fallbackSocket?.restart()
		router?.restart()
	}

	function close() {
		if (isDisposed) return
		isDisposed = true

		router?.close()
		router = null
		fallbackSocket?.close()
		fallbackSocket = null

		followerReceiver?.close()
		followerReceiver = null
		leader?.close()
		presenter.close()
		channel?.close()

		messageListeners.clear()
		statusListeners.clear()
	}

	return {
		tabId,
		get connectionStatus() {
			const status = $connectionStatus.get()
			return status === 'initial' ? 'offline' : status
		},
		get $isPresenter() {
			return presenter.$isPresenter
		},
		get mode() {
			return getMode()
		},
		sendMessage,
		onReceiveMessage,
		onStatusChange,
		restart,
		close,
	}
}

function resolveChannel(
	override: BroadcastChannelLike | null | undefined,
	channelKey: string
): BroadcastChannelLike | null {
	if (override !== undefined) return override
	if (typeof BroadcastChannel === 'undefined') return null
	return new BroadcastChannel(`tldraw-room-${channelKey}`) as BroadcastChannelLike
}

function resolveLocks(
	override: CrossTabLockManager | null | undefined
): CrossTabLockManager | null {
	if (override === null) return null
	if (override !== undefined) return override
	if (typeof navigator === 'undefined') return null
	return (navigator as unknown as { locks?: CrossTabLockManager }).locks ?? null
}
