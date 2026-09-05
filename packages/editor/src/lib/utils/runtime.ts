/** @public */
export const runtime: {
	openWindow(url: string, target: string, allowReferrer?: boolean): void
	refreshPage(): void
	hardReset(): Promise<void>
} = {
	openWindow(url, target, allowReferrer = false) {
		return window.open(url, target, allowReferrer ? 'noopener' : 'noopener noreferrer')
	},
	refreshPage() {
		window.location.reload()
	},
	async hardReset() {
		// Only reached from the error fallback, so don't make every consumer ship the IndexedDB code
		const { hardReset } = await import('./sync/hardReset')
		return await hardReset({ shouldReload: true })
	},
}

/** @public */
export function setRuntimeOverrides(input: Partial<typeof runtime>) {
	Object.assign(runtime, input)
}

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

/** @public */
export function refreshPage() {
	runtime.refreshPage()
}

/** @public */
export function hardResetEditor() {
	runtime.hardReset().catch((err) => {
		// The reset code is loaded on demand; if that load fails (the user is likely already on
		// the error fallback, possibly offline) at least get them a fresh page.
		console.error(err)
		runtime.refreshPage()
	})
}
