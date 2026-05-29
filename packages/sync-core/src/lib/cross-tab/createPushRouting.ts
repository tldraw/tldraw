import { TLRecord } from '@tldraw/tlschema'
import { NetworkDiff } from '../diff'

/**
 * Routing entry kept while a push request is in flight to the server. The
 * leader stashes the original tab + clock so it can rewrite the
 * `push_result` back to the originator, and stashes the diff so it can
 * synthesize a `patch` event for sibling tabs on commit.
 *
 * @internal
 */
export interface PushRoute {
	fromTabId: string
	originalClock: number
	originalDiff?: NetworkDiff<TLRecord>
}

/** What {@link createPushRouting} returns. */
export interface PushRouting {
	/**
	 * Allocate a new leader-side `clientClock` for a forwarded push.
	 * Remembers the originator so we can route the `push_result` back.
	 */
	registerPush(route: PushRoute): number
	/**
	 * Remember which tab sent a `connect` so we can route the server's
	 * response by `connectRequestId`.
	 */
	registerConnect(connectRequestId: string, fromTabId: string): void
	/**
	 * Look up and remove the routing entry for an incoming `push_result`.
	 * Returns `null` if the entry has been consumed already or never
	 * existed (e.g. stale result from before a leader handoff).
	 */
	consumePushResult(clientClock: number): PushRoute | null
	/**
	 * Look up and remove the routing entry for an incoming `connect`
	 * response. Returns `null` if no entry exists.
	 */
	consumeConnect(connectRequestId: string): string | null
	/** Drop everything (on close). */
	clear(): void
}

/**
 * Create the leader-side routing tables.
 *
 * Two maps and a counter: outgoing push requests get a fresh monotonic
 * leader-side clock; the originator's `(tabId, originalClock)` is kept
 * for response routing. Connect requests get their `connectRequestId`
 * routed back to the originating tab.
 *
 * Stateful but no I/O — pure logic, easy to test in isolation.
 *
 * @internal
 */
export function createPushRouting(): PushRouting {
	const pushes = new Map<number, PushRoute>()
	const connects = new Map<string, string>()
	let nextLeaderClock = 0

	return {
		registerPush(route) {
			const leaderClock = nextLeaderClock++
			pushes.set(leaderClock, route)
			return leaderClock
		},
		registerConnect(connectRequestId, fromTabId) {
			connects.set(connectRequestId, fromTabId)
		},
		consumePushResult(clientClock) {
			const route = pushes.get(clientClock)
			if (!route) return null
			pushes.delete(clientClock)
			return route
		},
		consumeConnect(connectRequestId) {
			const tabId = connects.get(connectRequestId)
			if (!tabId) return null
			connects.delete(connectRequestId)
			return tabId
		},
		clear() {
			pushes.clear()
			connects.clear()
		},
	}
}
