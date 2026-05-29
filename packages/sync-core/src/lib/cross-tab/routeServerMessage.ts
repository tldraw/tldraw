import { TLRecord } from '@tldraw/tlschema'
import { NetworkDiff } from '../diff'
import { TLSocketServerSentEvent } from '../protocol'
import { PushRoute, PushRouting } from './createPushRouting'

/**
 * Delivery callbacks `routeServerMessage` uses to dispatch its results.
 * The router doesn't know about channels or local listeners — it asks
 * the caller to deliver.
 *
 * @internal
 */
export interface ServerMessageDispatch {
	/** Deliver to every tab in the pool (including the leader). */
	toAll(msg: TLSocketServerSentEvent<TLRecord>): void
	/** Deliver to a specific tab (the leader's own listeners if `tabId` matches). */
	to(toTabId: string, msg: TLSocketServerSentEvent<TLRecord>): void
	/** Deliver to every tab in the pool except one. Used for sibling-patch synthesis. */
	toAllExcept(exceptTabId: string, msg: TLSocketServerSentEvent<TLRecord>): void
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
 *
 * @internal
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

/**
 * Process a single `push_result` into a routed response and an optional
 * synthesized patch for siblings. Returns `null` if we have no routing
 * entry — presumably a stale result from before a leader handoff.
 *
 * @internal
 */
export function dispatchSinglePushResult(
	msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>,
	routing: PushRouting
): {
	toTabId: string
	routed: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'push_result' }>
	synthesized: TLSocketServerSentEvent<TLRecord> | null
} | null {
	const route = routing.consumePushResult(msg.clientClock)
	if (!route) return null
	const routed = { ...msg, clientClock: route.originalClock }
	const synthesized = synthesizePatchForSiblings(msg, route)
	return { toTabId: route.fromTabId, routed, synthesized }
}

/**
 * Route a server-sent message to the right recipients.
 *
 * - `connect` → routed to the tab whose `connectRequestId` matches.
 * - `push_result` → routed back to the originating tab (clientClock
 *   unmap) AND a synthesized `patch` is fanned out to the other tabs in
 *   the pool, so they see changes that came from a sibling tab.
 * - `data` → split: routed entries dispatched per-tab, broadcast entries
 *   go to all tabs, synthesized patches go to non-originator tabs.
 * - Everything else → broadcast to all tabs.
 *
 * Stateless w.r.t. transports — takes routing tables and dispatch
 * callbacks. Easy to test with a stub dispatch object.
 *
 * @internal
 */
export function routeServerMessage(
	msg: TLSocketServerSentEvent<TLRecord>,
	routing: PushRouting,
	dispatch: ServerMessageDispatch
): void {
	switch (msg.type) {
		case 'connect': {
			const tabId = routing.consumeConnect(msg.connectRequestId)
			if (!tabId) {
				// We never saw a connect with this id — probably a race during
				// leader handoff. Broadcast as a safe default; tabs whose
				// connectRequestId doesn't match will ignore it inside
				// TLSyncClient.
				dispatch.toAll(msg)
				return
			}
			dispatch.to(tabId, msg)
			return
		}
		case 'push_result': {
			const d = dispatchSinglePushResult(msg, routing)
			if (!d) return
			dispatch.to(d.toTabId, d.routed)
			if (d.synthesized) dispatch.toAllExcept(d.toTabId, d.synthesized)
			return
		}
		case 'data':
			routeDataBatch(msg, routing, dispatch)
			return
		default:
			dispatch.toAll(msg)
			return
	}
}

function routeDataBatch(
	msg: Extract<TLSocketServerSentEvent<TLRecord>, { type: 'data' }>,
	routing: PushRouting,
	dispatch: ServerMessageDispatch
) {
	// Bucket inner events by destination: routed push_results per
	// originator, broadcast entries to everyone, synthesized patches for
	// non-originator tabs.
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
		const d = dispatchSinglePushResult(inner, routing)
		if (!d) continue
		const list = routedByTab.get(d.toTabId) ?? []
		list.push(d.routed)
		routedByTab.set(d.toTabId, list)
		if (d.synthesized) {
			syntheticsByOrigin.push({ exceptTabId: d.toTabId, msg: d.synthesized })
		}
	}

	if (broadcastInner.length > 0) {
		dispatch.toAll({ type: 'data', data: broadcastInner })
	}
	for (const [toTabId, list] of routedByTab) {
		dispatch.to(toTabId, { type: 'data', data: list })
	}
	for (const synth of syntheticsByOrigin) {
		dispatch.toAllExcept(synth.exceptTabId, synth.msg)
	}
}
