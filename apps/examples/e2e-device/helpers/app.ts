import type { Editor } from 'tldraw'

declare const editor: Editor

const NATIVE_CONTEXT = 'NATIVE_APP'

/**
 * Open the `/end-to-end` example (which exposes `window.editor`), wait for the
 * canvas, and reset to a known state: no animations, zoom at 1, no shapes.
 */
export async function openEditor() {
	const webContext = await currentWebContext()
	await browser.switchContext(webContext)

	if (!(await browser.getUrl()).includes('end-to-end')) {
		await browser.url(`${browser.options.baseUrl}/end-to-end`)
	}
	await browser.$('.tl-canvas').waitForExist({ timeout: 30_000 })

	await browser.execute(() => {
		editor.user.updateUserPreferences({ animationSpeed: 0 })
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		editor.setCurrentTool('select')
		editor.resetZoom()
		// Focus the canvas container so keyboard shortcuts reach the editor.
		;(document.querySelector('.tl-container') as HTMLElement | null)?.focus()
	})
}

/** Number of shapes on the current page. */
export function getShapeCount(): Promise<number> {
	return browser.execute(() => editor.getCurrentPageShapeIds().size)
}

/** Read the current zoom level from the live editor. */
export function getZoom(): Promise<number> {
	return browser.execute(() => editor.getZoomLevel())
}

/** Read the currently selected shape ids. */
export function getSelectedShapeIds(): Promise<string[]> {
	return browser.execute(() => editor.getSelectedShapeIds())
}

/** The webview context id changes per platform/run; find it rather than hardcode. */
export async function currentWebContext(): Promise<string> {
	const contexts = (await browser.getContexts()) as string[]
	const web = contexts.find((c) => c !== NATIVE_CONTEXT)
	if (!web) throw new Error(`No web context found. Available: ${contexts.join(', ')}`)
	return web
}

/**
 * Android Chrome shows a native permission dialog for the page's first
 * `navigator.clipboard.read()`, and the read promise stays pending until the
 * user answers it. Answer it the way a real user would. No-op on iOS and when
 * no dialog is showing (e.g. permission already granted).
 */
export async function grantClipboardPermissionIfPrompted() {
	if (!browser.isAndroid) return
	const web = await currentWebContext()
	await browser.switchContext(NATIVE_CONTEXT)
	try {
		const allow = browser.$('android=new UiSelector().textMatches("(?i)allow.*")')
		await allow.waitForExist({ timeout: 5000 })
		await allow.click()
	} catch {
		// No permission dialog appeared.
	} finally {
		await browser.switchContext(web)
	}
}
