import { TLRecord } from '@tldraw/tlschema'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import {
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketStatusChangeEvent,
} from '../TLSyncClient'
import { createPushRouting } from './createPushRouting'
import { routeServerMessage, ServerMessageDispatch } from './routeServerMessage'
import { CrossTabChannel, CrossTabMessage } from './types'

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
 * Build a {@link TLSocketStatusChangeEvent} from a bare status value. The
 * status enum permits `'error'`, but the event variant for `'error'`
 * requires a `reason`. In practice we only hit this for `'online'` /
 * `'offline'` when synthesizing initial events from a freshly created
 * socket — fall back to a placeholder reason for `'error'` rather than
 * crash if a socket somehow starts there.
 *
 * @internal
 */
export function toStatusChangeEvent(
	status: TLPersistentClientSocketStatus
): TLSocketStatusChangeEvent {
	if (status === 'error') return { status: 'error', reason: 'unknown' }
	return { status }
}

/**
 * Create the leader-side router. Owns the real WebSocket, owns the
 * routing tables, and dispatches server-sent messages to the right
 * tabs.
 *
 * Composes three smaller pieces:
 *
 * - `createPushRouting` — clientClock + connectRequestId tables.
 * - `routeServerMessage` — stateless dispatch logic, takes routing +
 *   delivery callbacks.
 * - This file — owns the channel/socket lifecycle and connects the
 *   above to real delivery (channel sends + local listener callbacks).
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
	const routing = createPushRouting()

	let lastBroadcastStatus: { status: TLPersistentClientSocketStatus; reason?: string } | null =
		null

	let isDisposed = false
	const socketUnsubscribes: Array<() => void> = []

	// --- delivery callbacks for routeServerMessage ---

	const dispatch: ServerMessageDispatch = {
		toAll(msg) {
			// Local first so the leader's own TLSyncClient processes it in
			// the same order as other tabs (which see it via the channel
			// post below).
			opts.onLocalServerMessage(msg)
			opts.channel.send({ _ct: 'server-all', msg })
		},
		to(toTabId, msg) {
			if (toTabId === opts.tabId) {
				opts.onLocalServerMessage(msg)
			} else {
				opts.channel.send({ _ct: 'server-to', toTabId, msg })
			}
		},
		toAllExcept(exceptTabId, msg) {
			if (exceptTabId !== opts.tabId) {
				opts.onLocalServerMessage(msg)
			}
			opts.channel.send({ _ct: 'server-broadcast-except', exceptTabId, msg })
		},
	}

	// --- outbound: client → server ---

	function forwardClientMessageToServer(
		fromTabId: string,
		msg: TLSocketClientSentEvent<TLRecord>
	) {
		switch (msg.type) {
			case 'push': {
				const leaderClock = routing.registerPush({
					fromTabId,
					originalClock: msg.clientClock,
					originalDiff: msg.diff,
				})
				opts.underlyingSocket.sendMessage({ ...msg, clientClock: leaderClock })
				return
			}
			case 'connect': {
				routing.registerConnect(msg.connectRequestId, fromTabId)
				opts.underlyingSocket.sendMessage(msg)
				return
			}
			default:
				// ping, custom, ...: no routing state needed.
				opts.underlyingSocket.sendMessage(msg)
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
		routing.clear()
	}

	// --- init ---
	const channelUnsubscribe = opts.channel.subscribe(onChannelMessage)
	socketUnsubscribes.push(
		opts.underlyingSocket.onReceiveMessage((msg) => routeServerMessage(msg, routing, dispatch)),
		opts.underlyingSocket.onStatusChange(handleStatusChange)
	)

	// Surface the initial status so followers leave 'initial' immediately
	// even if the WS doesn't fire its own status change.
	handleStatusChange(toStatusChangeEvent(opts.underlyingSocket.connectionStatus))

	return { sendLocalClientMessage, restart, close }
}
