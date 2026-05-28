import { BrowserContext } from './browser-context'
import { CrossTabChannel, CrossTabLockManager, CrossTabMessage } from './protocol'

/**
 * Owns the cross-tab leadership lock for a single tab.
 *
 * Uses {@link CrossTabLockManager | navigator.locks}'s mutex semantics for
 * mutual exclusion across tabs, layered with a visibility-driven
 * "want-lock" rule on top:
 *
 * - **Visible tabs always want the lock.** They're healthy: timers aren't
 *   throttled and the WebSocket pings stay on schedule.
 * - **Hidden tabs only want the lock if no other tab is visible.** Hidden
 *   tabs get their `setInterval` clamped, which means the server's health
 *   check would close the socket. So if anyone visible can take it, they
 *   should.
 *
 * Visibility status is gossiped over the channel. The leader re-evaluates
 * whether it should still hold the lock whenever own or peer visibility
 * changes; if it shouldn't, it releases (the next visible tab's queued
 * request resolves automatically).
 *
 * Doesn't know about WebSockets or the sync protocol — those live in
 * `LeaderRouter` and `CrossTabSocket`. Replaceable: a different leadership
 * strategy (e.g. SharedWorker) could implement the same callback contract.
 *
 * @internal
 */
export class Leader {
	private isDisposed = false
	private isLockRequestPending = false
	private releaseLock: (() => void) | null = null

	private myIsVisible = true
	private readonly peerVisibility = new Map<string, boolean>()

	private channelUnsubscribe: (() => void) | null = null
	private browserUnsubscribes: Array<() => void> = []

	constructor(
		private readonly opts: {
			channel: CrossTabChannel
			locks: CrossTabLockManager
			browserContext: BrowserContext | null
			lockName: string
			tabId: string
			/**
			 * Called when this tab acquires the lock. Will not be called if the
			 * lock acquisition races with a transition that says we no longer
			 * want it — in that case, the lock is released immediately and
			 * neither callback fires.
			 */
			onBecomeLeader(): void
			/**
			 * Called when this tab releases the lock — either voluntarily (we
			 * became hidden while a peer was visible) or as part of `close()`.
			 * Fires before the next waiter's `onBecomeLeader` on another tab.
			 */
			onLoseLeadership(): void
		}
	) {
		this.channelUnsubscribe = opts.channel.subscribe((msg) => this._onChannelMessage(msg))

		const env = opts.browserContext
		if (env) {
			this.myIsVisible = env.isVisible()
			opts.channel.send({ _ct: 'visibility', tabId: opts.tabId, visible: this.myIsVisible })
			opts.channel.send({ _ct: 'visibility-request', fromTabId: opts.tabId })
			this.browserUnsubscribes.push(
				env.onVisibilityChange(() => this._onLocalVisibilityChange())
			)
		} else {
			this.myIsVisible = true
		}

		this._requestLeadership()
	}

	close() {
		if (this.isDisposed) return
		this.isDisposed = true
		for (const unsub of this.browserUnsubscribes) unsub()
		this.browserUnsubscribes = []
		this.channelUnsubscribe?.()
		this.channelUnsubscribe = null
		// Releasing resolves the lock callback's promise, which lets the next
		// waiter (some peer in another tab) acquire it.
		this.releaseLock?.()
		this.releaseLock = null
		this.peerVisibility.clear()
	}

	private _requestLeadership() {
		if (this.isLockRequestPending || this.releaseLock || this.isDisposed) return
		this.isLockRequestPending = true
		// We don't await this; the promise resolves when leadership ends.
		void this.opts.locks.request(this.opts.lockName, { mode: 'exclusive' }, () => {
			return new Promise<void>((resolve) => {
				this.isLockRequestPending = false
				if (this.isDisposed) {
					resolve()
					return
				}
				// While our request was queued, conditions may have changed —
				// e.g., we became hidden and another tab became visible. Don't
				// take the lock if we no longer want it; resolve and let the
				// next waiter through.
				if (!this._shouldWantLock()) {
					resolve()
					return
				}
				this.releaseLock = () => {
					this.releaseLock = null
					this.opts.onLoseLeadership()
					resolve()
				}
				this.opts.onBecomeLeader()
			})
		})
	}

	/**
	 * Whether this tab currently wants to hold the leader lock.
	 *
	 * - Visible tabs always want it.
	 * - Hidden tabs want it only if no other tab is visible — someone has to
	 *   hold the socket, so as a last resort, it stays here.
	 */
	private _shouldWantLock(): boolean {
		if (this.myIsVisible) return true
		for (const visible of this.peerVisibility.values()) {
			if (visible) return false
		}
		return true
	}

	private _evaluateLockHold() {
		if (this.isDisposed) return
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
		if (this.isDisposed || !this.opts.browserContext) return
		const visible = this.opts.browserContext.isVisible()
		if (visible === this.myIsVisible) return
		this.myIsVisible = visible
		this.opts.channel.send({ _ct: 'visibility', tabId: this.opts.tabId, visible })
		this._evaluateLockHold()
	}

	private _onChannelMessage(msg: CrossTabMessage) {
		if (this.isDisposed) return
		switch (msg._ct) {
			case 'visibility':
				if (msg.tabId === this.opts.tabId) return
				this.peerVisibility.set(msg.tabId, msg.visible)
				this._evaluateLockHold()
				return
			case 'visibility-request':
				if (msg.fromTabId === this.opts.tabId) return
				// A new tab is asking what we are; reply with our current state.
				this.opts.channel.send({
					_ct: 'visibility',
					tabId: this.opts.tabId,
					visible: this.myIsVisible,
				})
				return
			default:
				return
		}
	}
}
