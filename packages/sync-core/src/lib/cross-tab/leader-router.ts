import { TLRecord } from '@tldraw/tlschema'
import { NetworkDiff } from '../diff'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import {
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketStatusChangeEvent,
} from '../TLSyncClient'
import { CrossTabChannel, CrossTabMessage } from './protocol'

// =====================================================================
// Pure helpers (module-level, easy to test in isolation)
// =====================================================================

/**
 * Build a {@link TLSocketStatusChangeEvent} from a bare status value. The
 * status enum permits `'error'`, but the event variant for `'error'`
 * requires a `reason`. In practice we only hit this for `'online'` /
 * `'offline'` when synthesizing initial events from a freshly created
 * socket — fall back to a placeholder reason for `'error'` rather than
 * crash if a socket somehow starts there.
 */
export function toStatusChangeEvent(
	status: TLPersistentClientSocketStatus
): TLSocketStatusChangeEvent {
	if (status === 'error') return { status: 'error', reason: 'unknown' }
	return { status }
}

/**
 * Routing entry kept while a push request is in flight to the server.
 */
export interface PushRoute {
	fromTabId: string
	originalClock: number
	originalDiff?: NetworkDiff<TLRecord>
}

/**
 * Build a `patch` for sibling tabs from a committed push.
 *
 * - `commit` → use the original push's diff verbatim.
 * - `rebaseWithDiff` → use the server's rebased diff.
 * - `discard` / empty diff → nothing to broadcast.
 *
 * Empty diffs typically come from presence-only pushes; presence records
 * aren't meaningful for siblings since each tab manages its own, so we
 * skip them.
 */
export function synthesizePatchForSiblings(
	msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>,
	route: PushRoute
): TLSocketServerSentEvent<TLRecord> | null {
	let diff: NetworkDiff<TLRecord> | undefined
	if (msg.action === 'commit') {
		diff = route.originalDiff
	} else if (typeof msg.action === 'object' && 'rebaseWithDiff' in msg.action) {
		diff = msg.action.rebaseWithDiff
	}
	if (!diff || Object.keys(diff).length === 0) return null
	return { type: 'patch', diff, serverClock: msg.serverClock }
}

// =====================================================================
// Factory
// =====================================================================

/** What {@link createLeaderRouter} returns. */
export interface LeaderRouter {
	/**
	 * Send a client message originating from the leader's own
	 * `TLSyncClient`. Equivalent to a follower sending the same message —
	 * `clientClock` is remapped, push diffs are remembered for sibling
	 * synthesis, etc.
	 */
	sendLocalClientMessage(msg: TLSocketClientSentEvent<TLRecord>): void
	/**
	 * Trigger a reconnect on the underlying socket. Followers see the
	 * status flicker over the channel and react via their own
	 * `TLSyncClient`s.
	 */
	restart(): void
	close(): void
}

/**
 * Create the leader-side message router. Owns the real WebSocket and the
 * protocol bookkeeping needed to give N tabs a single shared server
 * session.
 *
 * Three things keep this from being a straight pass-through:
 *
 * 1. **`clientClock` remapping.** Every tab's `TLSyncClient` numbers its
 *    own push requests independently. The server sees one session, so
 *    we allocate a leader-side clock for each forwarded push and remap
 *    the `push_result` back to the originator's clientClock when it
 *    returns.
 *
 * 2. **Synthesized patches for siblings.** The server suppresses
 *    self-broadcasts (`TLSyncRoom.broadcastPatch` excludes the source
 *    session), but "the source session" for us is N tabs. So when a
 *    push commits, we synthesize a `patch` event from the original (or
 *    rebased) diff and broadcast it to every tab except the originator.
 *
 * 3. **`connectRequestId` routing.** Each follower's `TLSyncClient`
 *    sends its own `connect` when its (virtual) socket comes online.
 *    The server replies to "our session" with a `connect` whose
 *    `connectRequestId` tells us which follower to route the response
 *    to.
 *
 * @internal
 */
export function createLeaderRouter(opts: {
	/**
	 * Underlying real-WS socket (typically a `ClientWebSocketAdapter`).
	 * The router owns its lifetime: closing the router closes the socket.
	 */
	underlyingSocket: TLPersistentClientSocket<
		TLSocketClientSentEvent<TLRecord>,
		TLSocketServerSentEvent<TLRecord>
	>
	channel: CrossTabChannel
	tabId: string
	/**
	 * Deliver a server message to the local tab's listeners (the leader's
	 * own `TLSyncClient`). Called for messages that target the leader
	 * specifically or broadcast to everyone.
	 */
	onLocalServerMessage(msg: TLSocketServerSentEvent<TLRecord>): void
	/**
	 * Underlying socket status changed. The router has already broadcast
	 * the change on the channel; this lets the host update its own
	 * connection-status atom.
	 */
	onStatusChange(ev: TLSocketStatusChangeEvent): void
}): LeaderRouter {
	const pushRouting = new Map<number, PushRoute>()
	let nextLeaderClock = 0
	const connectRouting = new Map<string, string>()

	let lastBroadcastStatus: { status: TLPersistentClientSocketStatus; reason?: string } | null =
		null

	let isDisposed = false
	const socketUnsubscribes: Array<() => void> = []

	// --- delivery helpers ---

	function deliverToAll(msg: TLSocketServerSentEvent<TLRecord>) {
		// Local first so the leader's own TLSyncClient processes it in the
		// same order as other tabs (which see it via the channel post below).
		opts.onLocalServerMessage(msg)
		opts.channel.send({ _ct: 'server-all', msg })
	}

	function deliverTo(toTabId: string, msg: TLSocketServerSentEvent<TLRecord>) {
		if (toTabId === opts.tabId) {
			opts.onLocalServerMessage(msg)
		} else {
			opts.channel.send({ _ct: 'server-to', toTabId, msg })
		}
	}

	function deliverToAllExcept(exceptTabId: string, msg: TLSocketServerSentEvent<TLRecord>) {
		if (exceptTabId !== opts.tabId) {
			opts.onLocalServerMessage(msg)
		}
		opts.channel.send({ _ct: 'server-broadcast-except', exceptTabId, msg })
	}

	// --- outbound: client → server ---

	function forwardClientMessageToServer(
		fromTabId: string,
		msg: TLSocketClientSentEvent<TLRecord>
	) {
		switch (msg.type) {
			case 'push': {
				const leaderClock = nextLeaderClock++
				pushRouting.set(leaderClock, {
					fromTabId,
					originalClock: msg.clientClock,
					originalDiff: msg.diff,
				})
				opts.underlyingSocket.sendMessage({ ...msg, clientClock: leaderClock })
				return
			}
			case 'connect': {
				connectRouting.set(msg.connectRequestId, fromTabId)
				opts.underlyingSocket.sendMessage(msg)
				return
			}
			default:
				// ping, custom, ...: no routing state needed.
				opts.underlyingSocket.sendMessage(msg)
				return
		}
	}

	// --- inbound: server → tabs ---

	/**
	 * Process a single `push_result` into a routed response and an
	 * optional synthesized patch for siblings. Returns `null` if we have
	 * no routing entry — presumably a stale result from before a leader
	 * handoff.
	 */
	function dispatchSinglePushResult(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>
	): {
		toTabId: string
		routed: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>
		synthesized: TLSocketServerSentEvent<TLRecord> | null
	} | null {
		const route = pushRouting.get(msg.clientClock)
		if (!route) return null
		pushRouting.delete(msg.clientClock)

		const routed = { ...msg, clientClock: route.originalClock }
		const synthesized = synthesizePatchForSiblings(msg, route)
		return { toTabId: route.fromTabId, routed, synthesized }
	}

	function handleServerConnect(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'connect' }>
	) {
		const tabId = connectRouting.get(msg.connectRequestId)
		if (!tabId) {
			// We never saw a connect with this id — probably a race during
			// leader handoff. Broadcast as a safe default; tabs whose
			// connectRequestId doesn't match will ignore it inside
			// TLSyncClient.
			deliverToAll(msg)
			return
		}
		connectRouting.delete(msg.connectRequestId)
		deliverTo(tabId, msg)
	}

	function handleServerPushResult(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>
	) {
		const dispatch = dispatchSinglePushResult(msg)
		if (!dispatch) return
		deliverTo(dispatch.toTabId, dispatch.routed)
		if (dispatch.synthesized) {
			deliverToAllExcept(dispatch.toTabId, dispatch.synthesized)
		}
	}

	function handleServerDataBatch(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'data' }>
	) {
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
			const dispatch = dispatchSinglePushResult(inner)
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
			deliverToAll({ type: 'data', data: broadcastInner })
		}
		for (const [toTabId, list] of routedByTab) {
			deliverTo(toTabId, { type: 'data', data: list })
		}
		for (const synth of syntheticsByOrigin) {
			deliverToAllExcept(synth.exceptTabId, synth.msg)
		}
	}

	function handleServerMessage(msg: TLSocketServerSentEvent<TLRecord>) {
		switch (msg.type) {
			case 'connect':
				handleServerConnect(msg)
				return
			case 'push_result':
				handleServerPushResult(msg)
				return
			case 'data':
				handleServerDataBatch(msg)
				return
			default:
				deliverToAll(msg)
				return
		}
	}

	// --- status propagation ---

	function handleStatusChange(ev: TLSocketStatusChangeEvent) {
		opts.onStatusChange(ev)
		const status = ev.status
		const reason = ev.status === 'error' ? ev.reason : undefined
		lastBroadcastStatus = { status, reason }
		opts.channel.send({ _ct: 'leader-status', status, reason })
	}

	// --- channel ---

	function onChannelMessage(msg: CrossTabMessage) {
		if (isDisposed) return
		switch (msg._ct) {
			case 'client':
				if (msg.fromTabId === opts.tabId) return
				forwardClientMessageToServer(msg.fromTabId, msg.msg)
				return
			case 'follower-hello':
				// A new follower came online. Re-broadcast our last status so
				// they can leave 'initial' immediately rather than wait for
				// our next status change.
				if (lastBroadcastStatus) {
					opts.channel.send({
						_ct: 'leader-status',
						status: lastBroadcastStatus.status,
						reason: lastBroadcastStatus.reason,
					})
				}
				return
			default:
				return
		}
	}

	// --- public surface ---

	function sendLocalClientMessage(msg: TLSocketClientSentEvent<TLRecord>) {
		forwardClientMessageToServer(opts.tabId, msg)
	}

	function restart() {
		opts.underlyingSocket.restart()
	}

	function close() {
		if (isDisposed) return
		isDisposed = true
		channelUnsubscribe()
		for (const unsub of socketUnsubscribes) unsub()
		socketUnsubscribes.length = 0
		opts.underlyingSocket.close()
		pushRouting.clear()
		connectRouting.clear()
	}

	// --- init ---
	const channelUnsubscribe = opts.channel.subscribe(onChannelMessage)
	socketUnsubscribes.push(
		opts.underlyingSocket.onReceiveMessage(handleServerMessage),
		opts.underlyingSocket.onStatusChange(handleStatusChange)
	)

	// Surface the initial status so followers leave 'initial' immediately
	// even if the WS doesn't fire its own status change.
	handleStatusChange(toStatusChangeEvent(opts.underlyingSocket.connectionStatus))

	return { sendLocalClientMessage, restart, close }
}
