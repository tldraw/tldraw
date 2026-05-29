import { BroadcastChannelLike, BrowserContext, CrossTabLockManager } from './types'

/**
 * Resolution of the real browser globals the cross-tab machinery depends on
 * (`BroadcastChannel`, `navigator.locks`, `window` / `document`) into the
 * injectable abstractions the modules consume. Each falls back to a benign
 * default when the global is missing (SSR, older webviews) so the adapter
 * degrades to per-tab behavior instead of throwing. Tests inject their own
 * implementations and never reach this file.
 */

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
		function handler() {
			cb()
		}
		window.addEventListener('focus', handler)
		return () => window.removeEventListener('focus', handler)
	},
	onVisibilityChange(cb) {
		if (typeof document === 'undefined') return () => {}
		function handler() {
			cb()
		}
		document.addEventListener('visibilitychange', handler)
		return () => document.removeEventListener('visibilitychange', handler)
	},
}

/**
 * Resolve the {@link BroadcastChannelLike} to use. A test override (including
 * an explicit `null` to force fallback mode) wins; otherwise construct a real
 * `BroadcastChannel`, or return `null` where the API is unavailable.
 *
 * @internal
 */
export function resolveChannel(
	override: BroadcastChannelLike | null | undefined,
	channelKey: string
): BroadcastChannelLike | null {
	if (override !== undefined) return override
	if (typeof BroadcastChannel === 'undefined') return null
	return new BroadcastChannel(`tldraw-room-${channelKey}`) as BroadcastChannelLike
}

/**
 * Resolve the {@link CrossTabLockManager} to use. A test override (including
 * an explicit `null` to force fallback mode) wins; otherwise use
 * `navigator.locks`, or return `null` where it's unavailable (some embedded
 * webviews) so the adapter falls back to per-tab sockets.
 *
 * @internal
 */
export function resolveLocks(
	override: CrossTabLockManager | null | undefined
): CrossTabLockManager | null {
	if (override === null) return null
	if (override !== undefined) return override
	if (typeof navigator === 'undefined') return null
	return (navigator as unknown as { locks?: CrossTabLockManager }).locks ?? null
}
