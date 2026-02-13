import { runtime } from './runtime'

/**
 * Open a new window with the given URL and target. Prefer this to the window.open function, as it
 * will work more reliably in embedded scenarios, such as our VS Code extension. See the runtime
 * object in tldraw/editor for more details.
 *
 * @param url - The URL to open.
 * @param target - The target window to open the URL in.
 * @param allowReferrer - Whether to allow the referrer to be sent to the new window.
 * @returns The new window object.
 * @public
 */
export function openWindow(url: string, target = '_blank', allowReferrer?: boolean) {
	return runtime.openWindow(url, target, allowReferrer)
}
