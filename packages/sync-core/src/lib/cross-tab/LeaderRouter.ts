import { TLRecord } from '@tldraw/tlschema'
import { NetworkDiff } from '../diff'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import {
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketStatusChangeEvent,
} from '../TLSyncClient'
import { CrossTabChannel, CrossTabMessage } from './protocol'

/**
 * Build a {@link TLSocketStatusChangeEvent} from a bare status value. The
 * status enum permits `'error'`, but the event variant for `'error'` requires
 * a `reason`. In practice we only hit this for `'online'` / `'offline'` when
 * synthesizing initial events from a freshly created socket — fall back to a
 * placeholder reason for `'error'` rather than crash if a socket somehow
 * starts there.
 */
function toStatusChangeEvent(status: TLPersistentClientSocketStatus): TLSocketStatusChangeEvent {
	if (status === 'error') return { status: 'error', reason: 'unknown' }
	return { status }
}

/**
 * The leader-side message router. Owns the real WebSocket and the protocol
 * bookkeeping needed to give N tabs a single shared server session.
 *
 * Three things keep this from being a straight pass-through:
 *
 * 1. **`clientClock` remapping.** Every tab's `TLSyncClient` numbers its own
 *    push requests independently. The server sees one session, so we
 *    allocate a leader-side clock for each forwarded push and remap the
 *    `push_result` back to the originator's clientClock when it returns.
 *
 * 2. **Synthesized patches for siblings.** The server suppresses
 *    self-broadcasts (`TLSyncRoom.broadcastPatch` excludes the source
 *    session), but "the source session" for us is N tabs. So when a push
 *    commits, we synthesize a `patch` event from the original (or rebased)
 *    diff and broadcast it to every tab except the originator.
 *
 * 3. **`connectRequestId` routing.** Each follower's `TLSyncClient` sends
 *    its own `connect` when its (virtual) socket comes online. The server
 *    replies to "our session" with a `connect` whose `connectRequestId`
 *    tells us which follower to route the response to.
 *
 * @internal
 */
export class LeaderRouter {
	private readonly pushRouting = new Map<
		number,
		{ fromTabId: string; originalClock: number; originalDiff?: NetworkDiff<TLRecord> }
	>()
	private nextLeaderClock = 0
	private readonly connectRouting = new Map<string, string>()

	private lastBroadcastStatus: { status: TLPersistentClientSocketStatus; reason?: string } | null =
		null

	private channelUnsubscribe: () => void
	private socketUnsubscribes: Array<() => void> = []
	private isDisposed = false

	constructor(
		private readonly opts: {
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
			 * Deliver a server message to the local tab's listeners (the
			 * leader's own `TLSyncClient`). Called for messages that target the
			 * leader specifically or broadcast to everyone.
			 */
			onLocalServerMessage(msg: TLSocketServerSentEvent<TLRecord>): void
			/**
			 * Underlying socket status changed. The router has already
			 * broadcast the change on the channel; this lets the host update
			 * its own connection-status atom.
			 */
			onStatusChange(ev: TLSocketStatusChangeEvent): void
		}
	) {
		this.channelUnsubscribe = opts.channel.subscribe((msg) => this._onChannelMessage(msg))
		this.socketUnsubscribes.push(
			opts.underlyingSocket.onReceiveMessage((msg) => this._handleServerMessage(msg)),
			opts.underlyingSocket.onStatusChange((ev) => this._handleStatusChange(ev))
		)

		// Surface the initial status so followers leave 'initial' immediately
		// even if the WS doesn't fire its own status change.
		const initial = toStatusChangeEvent(opts.underlyingSocket.connectionStatus)
		this._handleStatusChange(initial)
	}

	/**
	 * Send a client message originating from the leader's own `TLSyncClient`.
	 * Equivalent to a follower sending the same message — `clientClock` is
	 * remapped, push diffs are remembered for sibling synthesis, etc.
	 */
	sendLocalClientMessage(msg: TLSocketClientSentEvent<TLRecord>) {
		this._forwardClientMessageToServer(this.opts.tabId, msg)
	}

	/**
	 * Trigger a reconnect on the underlying socket. Followers see the status
	 * flicker over the channel and react via their own `TLSyncClient`s.
	 */
	restart() {
		this.opts.underlyingSocket.restart()
	}

	close() {
		if (this.isDisposed) return
		this.isDisposed = true
		this.channelUnsubscribe()
		for (const unsub of this.socketUnsubscribes) unsub()
		this.socketUnsubscribes = []
		this.opts.underlyingSocket.close()
		this.pushRouting.clear()
		this.connectRouting.clear()
	}

	// === Outbound: client → server ===

	private _forwardClientMessageToServer(
		fromTabId: string,
		msg: TLSocketClientSentEvent<TLRecord>
	) {
		switch (msg.type) {
			case 'push': {
				const leaderClock = this.nextLeaderClock++
				this.pushRouting.set(leaderClock, {
					fromTabId,
					originalClock: msg.clientClock,
					originalDiff: msg.diff,
				})
				this.opts.underlyingSocket.sendMessage({ ...msg, clientClock: leaderClock })
				return
			}
			case 'connect': {
				this.connectRouting.set(msg.connectRequestId, fromTabId)
				this.opts.underlyingSocket.sendMessage(msg)
				return
			}
			default:
				// ping, custom, ...: no routing state needed.
				this.opts.underlyingSocket.sendMessage(msg)
				return
		}
	}

	// === Inbound: server → tabs ===

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
				this._deliverToAll(msg)
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
			this._deliverToAll(msg)
			return
		}
		this.connectRouting.delete(msg.connectRequestId)
		this._deliverTo(tabId, msg)
	}

	private _handleServerPushResult(
		msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>
	) {
		const dispatch = this._dispatchSinglePushResult(msg)
		if (!dispatch) return
		this._deliverTo(dispatch.toTabId, dispatch.routed)
		if (dispatch.synthesized) {
			this._deliverToAllExcept(dispatch.toTabId, dispatch.synthesized)
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
			this._deliverToAll({ type: 'data', data: broadcastInner })
		}
		for (const [toTabId, list] of routedByTab) {
			this._deliverTo(toTabId, { type: 'data', data: list })
		}
		for (const synth of syntheticsByOrigin) {
			this._deliverToAllExcept(synth.exceptTabId, synth.msg)
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
		// was empty (presence-only pushes — presence records aren't meaningful
		// for siblings since each tab manages its own).
		if (!diff || Object.keys(diff).length === 0) return null
		return { type: 'patch', diff, serverClock: msg.serverClock }
	}

	// === Delivery helpers ===

	private _deliverToAll(msg: TLSocketServerSentEvent<TLRecord>) {
		// Local first so the leader's own TLSyncClient processes it in the same
		// order as other tabs (which see it via the channel post below).
		this.opts.onLocalServerMessage(msg)
		this.opts.channel.send({ _ct: 'server-all', msg })
	}

	private _deliverTo(toTabId: string, msg: TLSocketServerSentEvent<TLRecord>) {
		if (toTabId === this.opts.tabId) {
			this.opts.onLocalServerMessage(msg)
		} else {
			this.opts.channel.send({ _ct: 'server-to', toTabId, msg })
		}
	}

	private _deliverToAllExcept(exceptTabId: string, msg: TLSocketServerSentEvent<TLRecord>) {
		if (exceptTabId !== this.opts.tabId) {
			this.opts.onLocalServerMessage(msg)
		}
		this.opts.channel.send({ _ct: 'server-broadcast-except', exceptTabId, msg })
	}

	// === Status propagation ===

	private _handleStatusChange(ev: TLSocketStatusChangeEvent) {
		this.opts.onStatusChange(ev)
		const status = ev.status
		const reason = ev.status === 'error' ? ev.reason : undefined
		this.lastBroadcastStatus = { status, reason }
		this.opts.channel.send({ _ct: 'leader-status', status, reason })
	}

	// === Channel handling ===

	private _onChannelMessage(msg: CrossTabMessage) {
		if (this.isDisposed) return
		switch (msg._ct) {
			case 'client':
				if (msg.fromTabId === this.opts.tabId) return
				this._forwardClientMessageToServer(msg.fromTabId, msg.msg)
				return
			case 'follower-hello':
				// A new follower came online. Re-broadcast our last status so
				// they can leave 'initial' immediately rather than wait for our
				// next status change.
				if (this.lastBroadcastStatus) {
					this.opts.channel.send({
						_ct: 'leader-status',
						status: this.lastBroadcastStatus.status,
						reason: this.lastBroadcastStatus.reason,
					})
				}
				return
			default:
				return
		}
	}
}
