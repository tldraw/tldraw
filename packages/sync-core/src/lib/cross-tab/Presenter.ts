import { atom, Atom } from '@tldraw/state'
import { CrossTabBrowserEnv } from './browser-env'
import { CrossTabChannel, CrossTabMessage } from './protocol'

/**
 * Tracks which tab in a same-user pool is the **presenter** — the tab whose
 * cursor moves should be pushed to the server. Last-write-wins on `focus`
 * events, with `(claim, tabId)` lexicographic ordering for tiebreaks.
 *
 * Pulled out from `CrossTabSocket` so the focus-driven gossip lives away
 * from the WebSocket plumbing. The signal {@link Presenter.$isPresenter} is
 * what `useSync` reads to gate `presenceMode`: only the presenter pushes
 * presence, even when N tabs share a leader's WebSocket session.
 *
 * @internal
 */
export class Presenter {
	private readonly _isPresenter: Atom<boolean> = atom('cross-tab presenter', false)

	private myClaim = 0
	private highestClaim = 0
	private highestTabId = ''
	private isDisposed = false
	private channelUnsubscribe: (() => void) | null = null
	private browserUnsubscribes: Array<() => void> = []

	constructor(
		private readonly opts: {
			/**
			 * The shared channel. Pass `null` to operate in single-tab mode —
			 * this tab is unconditionally the presenter and no gossip happens.
			 */
			channel: CrossTabChannel | null
			browserEnv: CrossTabBrowserEnv | null
			tabId: string
		}
	) {
		if (!opts.channel) {
			// Single-tab / fallback: trivially the presenter.
			this._isPresenter.set(true)
			return
		}

		this.channelUnsubscribe = opts.channel.subscribe((msg) => this._onChannelMessage(msg))

		const env = opts.browserEnv
		if (!env) {
			// No browser env: assume we're the only tab that matters.
			this._claim()
			return
		}

		if (env.hasFocus()) this._claim()
		this.browserUnsubscribes.push(env.onFocus(() => this._onLocalFocus()))
	}

	/**
	 * Reactive signal that's true when this tab is the presenter.
	 */
	get $isPresenter(): Atom<boolean> {
		return this._isPresenter
	}

	close() {
		if (this.isDisposed) return
		this.isDisposed = true
		for (const unsub of this.browserUnsubscribes) unsub()
		this.browserUnsubscribes = []
		this.channelUnsubscribe?.()
		this.channelUnsubscribe = null
	}

	private _onLocalFocus() {
		if (this.isDisposed) return
		this._claim()
	}

	private _claim() {
		// Bump past the highest seen claim. The tabId tiebreaker handles the
		// rare case where two tabs make claims with the same numeric value.
		const next = Math.max(this.highestClaim, this.myClaim) + 1
		this.myClaim = next
		this.highestClaim = next
		this.highestTabId = this.opts.tabId
		this.opts.channel?.send({
			_ct: 'presenter-claim',
			tabId: this.opts.tabId,
			claim: next,
		})
		if (!this._isPresenter.get()) this._isPresenter.set(true)
	}

	private _onChannelMessage(msg: CrossTabMessage) {
		if (this.isDisposed) return
		if (msg._ct !== 'presenter-claim') return
		if (msg.tabId === this.opts.tabId) return
		// Higher (claim, tabId) wins.
		const isHigher =
			msg.claim > this.highestClaim ||
			(msg.claim === this.highestClaim && msg.tabId > this.highestTabId)
		if (!isHigher) return
		this.highestClaim = msg.claim
		this.highestTabId = msg.tabId
		if (this._isPresenter.get()) this._isPresenter.set(false)
	}
}
