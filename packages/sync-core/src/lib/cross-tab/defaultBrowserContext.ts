import { BrowserContext } from './types'

/**
 * Default {@link BrowserContext} that wraps real `window` / `document`. In
 * non-browser environments (SSR, Node tests without jsdom) all methods are
 * benign no-ops — `hasFocus` returns false, `isVisible` returns true (treat
 * the tab as visible so the existing always-request-leader behavior keeps
 * working), and event subscriptions don't fire.
 *
 * @internal
 */
export const defaultBrowserContext: BrowserContext = {
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
