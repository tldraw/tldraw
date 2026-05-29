import { atom, Atom } from '@tldraw/state'
import { BrowserContext, CrossTabChannel, CrossTabMessage } from './types'

/** What {@link createPresenter} returns. */
export interface Presenter {
	/** True when this tab is the presenter — the most-recently-focused tab in the pool. */
	$isPresenter: Atom<boolean>
	close(): void
}

/**
 * Lexicographic `(claim, tabId)` ordering for presenter election.
 * Higher pair wins. Tabs broadcast their `(claim, tabId)` on focus; on
 * receive, a tab drops out of presenter if it hears a higher pair.
 */
function isHigherClaim(
	claim: number,
	tabId: string,
	vsClaim: number,
	vsTabId: string
): boolean {
	return claim > vsClaim || (claim === vsClaim && tabId > vsTabId)
}

/**
 * Track which tab in a same-user pool is the **presenter** — the tab whose
 * cursor moves should be pushed to the server. Last-write-wins on `focus`
 * events, with `(claim, tabId)` lexicographic ordering for tiebreaks.
 *
 * The returned `$isPresenter` signal is what `useSync` reads to gate
 * `presenceMode`: only the presenter pushes presence, even when N tabs
 * share a leader's WebSocket session.
 *
 * @internal
 */
export function createPresenter(opts: {
	/**
	 * The shared channel. Pass `null` to operate in single-tab mode — this
	 * tab is unconditionally the presenter and no gossip happens.
	 */
	channel: CrossTabChannel | null
	browserContext: BrowserContext | null
	tabId: string
}): Presenter {
	const $isPresenter = atom('cross-tab presenter', false)

	let myClaim = 0
	let highestClaim = 0
	let highestTabId = ''
	let isDisposed = false
	const browserUnsubscribes: Array<() => void> = []
	let channelUnsubscribe: (() => void) | null = null

	function claim() {
		// Bump past the highest seen claim. The tabId tiebreaker handles the
		// rare case where two tabs make claims with the same numeric value.
		const next = Math.max(highestClaim, myClaim) + 1
		myClaim = next
		highestClaim = next
		highestTabId = opts.tabId
		opts.channel?.send({ _ct: 'presenter-claim', tabId: opts.tabId, claim: next })
		if (!$isPresenter.get()) $isPresenter.set(true)
	}

	function onChannelMessage(msg: CrossTabMessage) {
		if (isDisposed) return
		if (msg._ct !== 'presenter-claim') return
		if (msg.tabId === opts.tabId) return
		if (!isHigherClaim(msg.claim, msg.tabId, highestClaim, highestTabId)) return
		highestClaim = msg.claim
		highestTabId = msg.tabId
		if ($isPresenter.get()) $isPresenter.set(false)
	}

	function close() {
		if (isDisposed) return
		isDisposed = true
		for (const unsub of browserUnsubscribes) unsub()
		browserUnsubscribes.length = 0
		channelUnsubscribe?.()
		channelUnsubscribe = null
	}

	// --- init ---
	if (!opts.channel) {
		// Single-tab / fallback: trivially the presenter.
		$isPresenter.set(true)
		return { $isPresenter, close }
	}

	channelUnsubscribe = opts.channel.subscribe(onChannelMessage)

	const ctx = opts.browserContext
	if (!ctx) {
		// No browser context: assume we're the only tab that matters.
		claim()
	} else {
		if (ctx.hasFocus()) claim()
		browserUnsubscribes.push(ctx.onFocus(() => !isDisposed && claim()))
	}

	return { $isPresenter, close }
}
