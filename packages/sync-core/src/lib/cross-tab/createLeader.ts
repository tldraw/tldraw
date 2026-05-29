import { BrowserContext, CrossTabChannel, CrossTabLockManager, CrossTabMessage } from './types'

/** What {@link createLeader} returns. */
export interface Leader {
	close(): void
}

/**
 * Own the cross-tab leadership lock for a single tab.
 *
 * Uses `navigator.locks`'s mutex semantics for mutual exclusion across
 * tabs, layered with a visibility-driven "want-lock" rule (see `want`
 * below). Visibility status is gossiped over the channel.
 * The leader re-evaluates whether it should still hold the lock whenever
 * own or peer visibility changes; if it shouldn't, it releases (the next
 * visible tab's queued request resolves automatically).
 *
 * Doesn't know about WebSockets or the sync protocol — those live in
 * `createLeaderRouter` and `createCrossTabSocket`. Replaceable: a
 * different leadership strategy (e.g. SharedWorker) could implement the
 * same callback contract.
 *
 * @internal
 */
export function createLeader(opts: {
	channel: CrossTabChannel
	locks: CrossTabLockManager
	browserContext: BrowserContext | null
	lockName: string
	tabId: string
	/**
	 * Called when this tab acquires the lock. Will not be called if the
	 * lock acquisition races with a transition that says we no longer want
	 * it — in that case, the lock is released immediately and neither
	 * callback fires.
	 */
	onBecomeLeader(): void
	/**
	 * Called when this tab releases the lock — either voluntarily (we
	 * became hidden while a peer was visible) or as part of `close()`.
	 * Fires before the next waiter's `onBecomeLeader` on another tab.
	 */
	onLoseLeadership(): void
}): Leader {
	let isDisposed = false
	let isLockRequestPending = false
	let releaseLock: (() => void) | null = null

	let myIsVisible = true
	const peerVisibility = new Map<string, boolean>()

	const browserUnsubscribes: Array<() => void> = []

	function want(): boolean {
		// Visible tabs always want the lock (they're healthy: timers aren't
		// throttled, pings stay on schedule). A hidden tab wants it only as a
		// last resort, when no peer is visible to take over.
		return myIsVisible || ![...peerVisibility.values()].some((visible) => visible)
	}

	function requestLeadership() {
		if (isLockRequestPending || releaseLock || isDisposed) return
		isLockRequestPending = true
		// We don't await this; the promise resolves when leadership ends.
		void opts.locks.request(opts.lockName, { mode: 'exclusive' }, () => {
			return new Promise<void>((resolve) => {
				isLockRequestPending = false
				if (isDisposed) {
					resolve()
					return
				}
				// While our request was queued, conditions may have changed —
				// e.g., we became hidden and another tab became visible. Don't
				// take the lock if we no longer want it; resolve and let the
				// next waiter through.
				if (!want()) {
					resolve()
					return
				}
				releaseLock = () => {
					releaseLock = null
					opts.onLoseLeadership()
					resolve()
				}
				opts.onBecomeLeader()
			})
		})
	}

	function evaluateLockHold() {
		if (isDisposed) return
		const wantIt = want()
		if (releaseLock && !wantIt) {
			// We hold the lock but a visible peer should take over.
			releaseLock()
			return
		}
		if (!releaseLock && wantIt && !isLockRequestPending) {
			// We don't have it and want it back (e.g., visibility came back).
			requestLeadership()
		}
	}

	function onLocalVisibilityChange() {
		if (isDisposed || !opts.browserContext) return
		const visible = opts.browserContext.isVisible()
		if (visible === myIsVisible) return
		myIsVisible = visible
		opts.channel.send({ _ct: 'visibility', tabId: opts.tabId, visible })
		evaluateLockHold()
	}

	function onChannelMessage(msg: CrossTabMessage) {
		if (isDisposed) return
		switch (msg._ct) {
			case 'visibility':
				if (msg.tabId === opts.tabId) return
				peerVisibility.set(msg.tabId, msg.visible)
				evaluateLockHold()
				return
			case 'visibility-request':
				if (msg.fromTabId === opts.tabId) return
				// A new tab is asking what we are; reply with our current state.
				opts.channel.send({
					_ct: 'visibility',
					tabId: opts.tabId,
					visible: myIsVisible,
				})
				return
			default:
				return
		}
	}

	function close() {
		if (isDisposed) return
		isDisposed = true
		for (const unsub of browserUnsubscribes) unsub()
		browserUnsubscribes.length = 0
		channelUnsubscribe()
		// Releasing resolves the lock callback's promise, which lets the next
		// waiter (some peer in another tab) acquire it.
		releaseLock?.()
		releaseLock = null
		peerVisibility.clear()
	}

	const channelUnsubscribe = opts.channel.subscribe(onChannelMessage)

	const ctx = opts.browserContext
	if (ctx) {
		myIsVisible = ctx.isVisible()
		opts.channel.send({ _ct: 'visibility', tabId: opts.tabId, visible: myIsVisible })
		opts.channel.send({ _ct: 'visibility-request', fromTabId: opts.tabId })
		browserUnsubscribes.push(ctx.onVisibilityChange(onLocalVisibilityChange))
	} else {
		myIsVisible = true
	}

	requestLeadership()

	return { close }
}
