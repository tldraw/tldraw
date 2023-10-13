import { PlaywrightTestArgs, PlaywrightWorkerArgs } from '@playwright/test'
import { Editor } from '@tldraw/tldraw'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

// export async function expectPathToBe(page: Page, path: string) {
// 	expect(await page.evaluate(() => editor.root.path.value)).toBe(path)
// }

// export async function expectToHaveNShapes(page: Page, numberOfShapes: number) {
// 	expect(await page.evaluate(() => editor.currentPageShapes.length)).toBe(numberOfShapes)
// }

// export async function expectToHaveNSelectedShapes(page: Page, numberOfSelectedShapes: number) {
// 	expect(await page.evaluate(() => editor.selectedShapeIds.length)).toBe(numberOfSelectedShapes)
// }

declare const editor: Editor

export async function setup({ page }: PlaywrightTestArgs & PlaywrightWorkerArgs) {
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
	await page.evaluate(() => editor.selectNone())
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
