/**
 * Browser-environment hooks the cross-tab machinery uses to react to focus
 * and visibility changes. Pulled out as an interface so tests can drive them
 * deterministically; in production we wrap `window` and `document`.
 *
 * Focus drives the **presenter** role (the tab whose cursor moves should be
 * broadcast). Visibility drives **leader handoff** (a hidden leader can't
 * keep the socket healthy because background-tab timer throttling clamps the
 * ping interval, so the lock should migrate to a visible tab).
 *
 * @internal
 */
export interface CrossTabBrowserEnv {
	/** Whether the window currently has keyboard focus. */
	hasFocus(): boolean
	/**
	 * Whether the document is currently visible (not in a background tab
	 * strip, minimized window, etc).
	 */
	isVisible(): boolean
	/** Subscribe to window `focus` events. Returns an unsubscribe function. */
	onFocus(cb: () => void): () => void
	/**
	 * Subscribe to document `visibilitychange` events. Returns an unsubscribe
	 * function.
	 */
	onVisibilityChange(cb: () => void): () => void
}

/**
 * Default {@link CrossTabBrowserEnv} that wraps real `window` / `document`.
 * In non-browser environments (SSR, Node tests without jsdom) all methods are
 * benign no-ops — `hasFocus` returns false, `isVisible` returns true (treat
 * the tab as visible so the existing always-request-leader behavior keeps
 * working), and event subscriptions don't fire.
 *
 * @internal
 */
export const defaultBrowserEnv: CrossTabBrowserEnv = {
	hasFocus() {
		return typeof document !== 'undefined' ? document.hasFocus() : false
	},
	isVisible() {
		if (typeof document === 'undefined') return true
		return document.visibilityState === 'visible'
	},
	onFocus(cb) {
		if (typeof window === 'undefined') return () => {}
		const handler = () => cb()
		window.addEventListener('focus', handler)
		return () => window.removeEventListener('focus', handler)
	},
	onVisibilityChange(cb) {
		if (typeof document === 'undefined') return () => {}
		const handler = () => cb()
		document.addEventListener('visibilitychange', handler)
		return () => document.removeEventListener('visibilitychange', handler)
	},
}
