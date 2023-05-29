import { PlaywrightTestArgs, PlaywrightWorkerArgs } from '@playwright/test'
import { App } from '@tldraw/tldraw'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

// export async function expectPathToBe(page: Page, path: string) {
// 	expect(await page.evaluate(() => app.root.path.value)).toBe(path)
// }

// export async function expectToHaveNShapes(page: Page, numberOfShapes: number) {
// 	expect(await page.evaluate(() => app.shapesArray.length)).toBe(numberOfShapes)
// }

// export async function expectToHaveNSelectedShapes(page: Page, numberOfSelectedShapes: number) {
// 	expect(await page.evaluate(() => app.selectedIds.length)).toBe(numberOfSelectedShapes)
// }

declare const app: App

export async function setup({ page }: PlaywrightTestArgs & PlaywrightWorkerArgs) {
	await page.goto('http://localhost:5420/')
	await page.waitForSelector('.tl-canvas')
	await page.evaluate(() => (app.enableAnimations = false))
}

export async function setupWithShapes({
	page,
	context,
}: PlaywrightTestArgs & PlaywrightWorkerArgs) {
	await setup({ page, context } as any)
	await page.keyboard.press('r')
	await page.mouse.click(55, 55)
	await page.keyboard.press('r')
	await page.mouse.click(55, 205)
	await page.keyboard.press('r')
	await page.mouse.click(75, 355)
	await page.evaluate(async () => app.selectNone())
}

export async function cleanup({ page }: PlaywrightTestArgs) {
	await page.keyboard.press('Control+a')
	await page.keyboard.press('Delete')
}
