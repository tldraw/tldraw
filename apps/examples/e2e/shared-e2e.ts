import { Locator, Page, PlaywrightTestArgs, PlaywrightWorkerArgs } from '@playwright/test'
import { type Editor } from 'tldraw'

declare const editor: Editor

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function setup({ page, context }: PlaywrightTestArgs & PlaywrightWorkerArgs) {
	await context.grantPermissions(['clipboard-read', 'clipboard-write'])
	await setupPage(page)
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
