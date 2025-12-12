import {
	BrowserContext,
	Locator,
	Page,
	PlaywrightTestArgs,
	PlaywrightWorkerArgs,
} from '@playwright/test'
import { type Editor } from 'tldraw'

declare const editor: Editor

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function setup({ page, context }: PlaywrightTestArgs & PlaywrightWorkerArgs) {
	await context.grantPermissions(['clipboard-read', 'clipboard-write'])
	await setupPage(page)
}

/**
 * Smart setup that navigates on first run, then uses fast reset on subsequent runs.
 * Use this in beforeEach for optimal test performance with page reuse.
 */
export async function setupOrReset({ page, context }: { page: Page; context: BrowserContext }) {
	const url = page.url()
	if (!url.includes('end-to-end')) {
		await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		await setupPage(page)
	} else {
		await hardResetEditor(page)
	}
}

export async function setupWithShapes({ page }: PlaywrightTestArgs & PlaywrightWorkerArgs) {
	await setupPage(page)
	await setupPageWithShapes(page)
}

export async function cleanup({ page }: PlaywrightTestArgs) {
	await cleanupPage(page)
}

export async function setupPage(page: PlaywrightTestArgs['page']) {
	await page.goto('http://localhost:5420/end-to-end')
	await page.waitForSelector('.tl-canvas')
	await page.evaluate(() => {
		editor.user.updateUserPreferences({ animationSpeed: 0 })
	})
	await page.mouse.move(50, 50)
	// Ensure the container has focus for keyboard events
	await page.locator('.tl-container').focus()
}

/**
 * Fast reset of the editor state without page navigation.
 * Use this in beforeEach when the page is already set up via beforeAll.
 */
export async function hardResetEditor(page: Page) {
	await page.evaluate(() => {
		// Clear all shapes and reset editor state
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		editor.setCurrentTool('select')
		editor.zoomToFit()
		editor.resetZoom()
	})
	await page.mouse.move(50, 50)
	// Ensure the container has focus for keyboard events
	await page.locator('.tl-container').focus()
}

/**
 * Fast reset and create test shapes without page navigation.
 * Use this in beforeEach when tests need shapes but want to avoid full setup.
 */
export async function hardResetWithShapes(page: Page) {
	await page.evaluate(() => {
		// Clear all shapes and create test shapes
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		editor.createShapes([
			{ type: 'geo', x: 200, y: 200, props: { w: 100, h: 100, geo: 'rectangle' } },
			{ type: 'geo', x: 200, y: 250, props: { w: 100, h: 100, geo: 'rectangle' } },
			{ type: 'geo', x: 250, y: 300, props: { w: 100, h: 100, geo: 'rectangle' } },
		])
		editor.selectNone()
		editor.setCurrentTool('select')
	})
	await page.mouse.move(50, 50)
	// Ensure the container has focus for keyboard events
	await page.locator('.tl-container').focus()
}

export async function setupPageWithShapes(page: PlaywrightTestArgs['page']) {
	// delete everything
	await page.keyboard.press('Control+a')
	await page.keyboard.press('Backspace')

	// create shapes
	await page.keyboard.press('r')
	await page.mouse.click(200, 200)
	await page.keyboard.press('r')
	await page.mouse.click(200, 250)
	await page.keyboard.press('r')
	await page.mouse.click(250, 300)
	// deselect everything
	await page.keyboard.press('Escape')
	await page.keyboard.press('Escape')
}

export async function cleanupPage(page: PlaywrightTestArgs['page']) {
	await page.keyboard.press('Control+a')
	await page.keyboard.press('Delete')
}

export async function getAllShapeLabels(page: PlaywrightTestArgs['page']) {
	return await page
		.locator('.tl-shapes')
		.first()
		.evaluate((e) => {
			const labels: { index: string; label: string }[] = []
			for (const child of e.children) {
				const index = (child as HTMLDivElement).style.zIndex
				const label = child.querySelector('.tl-text-content') as HTMLDivElement
				labels.push({ index, label: label.innerText })
			}
			labels.sort((a, b) => (a.index > b.index ? 1 : -1))
			return labels.map((l) => l.label)
		})
}

export async function getAllShapeTypes(page: PlaywrightTestArgs['page']) {
	return await page
		.locator('.tl-shape')
		.elementHandles()
		.then((handles) => Promise.all(handles.map((h) => h.getAttribute('data-shape-type'))))
}

export async function withMenu<T>(page: Page, path: string, cb: (item: Locator) => Promise<T>) {
	const parts = path.split('.')
	const lastPartIdx = parts.length - 1
	for (let i = 0; i < lastPartIdx; i++) {
		const part = parts[i]
		if (i === 0) {
			// context menu should already be open
			if (part !== 'context-menu') {
				await page.getByTestId(`${part}.button`).click()
			}
		} else {
			await page.getByTestId(`${parts[0]}-sub.${part}-button`).click()
		}
	}

	// last part!
	return await cb(page.getByTestId(`${parts[0]}.${parts[lastPartIdx]}`))
}
export async function clickMenu(page: Page, path: string) {
	await withMenu(page, path, (item) => item.click())
}

// We need a way to wait for the editor to finish a tick
export function sleepFrames(frames = 2): Promise<void> {
	return sleep(frames * (1000 / 60))
}
