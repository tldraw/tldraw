import { CDPSession, expect } from '@playwright/test'
import { Editor } from 'tldraw'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

declare const editor: Editor

let client: CDPSession

const dispatchTouch = async (
	client: CDPSession,
	type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
	touchPoints: { x: number; y: number }[]
) => {
	await client.send('Input.dispatchTouchEvent', { type, touchPoints })
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

test.describe('camera', () => {
	test.beforeEach(setup)

	test('panning', async ({ isMobile, page }) => {
		test.skip(!isMobile)
		client = await page.context().newCDPSession(page)

		expect(await page.evaluate(() => editor.inputs.currentPagePoint)).toEqual({
			x: 50,
			y: 50,
			z: 0,
		})

		await dispatchTouch(client, 'touchStart', [
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
		])
		let finalTouch: { x: number; y: number }[] = [
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
		]
		for (let i = 1; i < 100; i++) {
			await dispatchTouch(client, 'touchMove', [
				{ x: 100 + i * 10, y: 100 + i * 10 },
				{ x: 200 + i * 10, y: 200 + i * 10 },
			])
			finalTouch = [
				{ x: 100 + i * 10, y: 100 + i * 10 },
				{ x: 200 + i * 10, y: 200 + i * 10 },
			]
			await sleep(10)
		}
		await dispatchTouch(client, 'touchEnd', finalTouch)

		await sleep(10)
		// not sure how the touch coordinates translate to the editor coordinates
		expect(
			await page.evaluate(() => [
				editor.inputs.currentPagePoint.x,
				editor.inputs.currentPagePoint.y,
			])
		).toStrictEqual([160, 160])
	})

	test.only('pinching on trackpad', async ({ page, isMobile }) => {
		// pinching on trackpad is the same event as ctrl+scrollwheel
		test.skip(isMobile)
		await page.evaluate(() => editor.updateInstanceState({ isGridMode: true }))
		const { mouse, keyboard } = page
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(1)
		// zooming in
		await keyboard.down('Control')
		// scrolling 15px on the mouse wheel is a bit less that 0.1 zoom level at default zoom speed
		await mouse.wheel(0, 15) // 0.9
		await mouse.wheel(0, 15) // 0.81
		await mouse.wheel(0, 15) // 0.72
		await keyboard.up('Control')
		expect(await page.evaluate(() => editor.getZoomLevel())).toBeCloseTo(0.72, 1)
		// zooming out
		// scrolling back doesn't progress in the same steps
		await keyboard.down('Control')
		await mouse.wheel(0, -15) // 0.8019000000000001
		await mouse.wheel(0, -15) // 0.88209
		await mouse.wheel(0, -15) // 0.970299
		await keyboard.up('Control')
		expect(await page.evaluate(() => editor.getZoomLevel())).toBeCloseTo(0.97)
	})

	test('pinching on touchscreen', async ({ page, isMobile }) => {
		test.skip(!isMobile)

		client = await page.context().newCDPSession(page)

		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(1)

		// zoom out

		await dispatchTouch(client, 'touchStart', [
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
		])
		let finalTouch: { x: number; y: number }[] = [
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
		]
		for (let i = 1; i < 50; i++) {
			await dispatchTouch(client, 'touchMove', [
				{ x: 100 + i, y: 100 + i },
				{ x: 200 - i, y: 200 - i },
			])
			finalTouch = [
				{ x: 100 + i, y: 100 + i },
				{ x: 200 - i, y: 200 - i },
			]
			await sleep(10)
		}
		await dispatchTouch(client, 'touchEnd', finalTouch)

		await sleep(10)
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(0.1)

		// now zoom in
		await dispatchTouch(client, 'touchStart', [
			{ x: 149, y: 149 },
			{ x: 150, y: 150 },
		])

		for (let i = 1; i < 50; i++) {
			await dispatchTouch(client, 'touchMove', [
				{ x: 149 - i, y: 149 - i },
				{ x: 150 + i, y: 150 + i },
			])
			finalTouch = [
				{ x: 149 - i, y: 149 - i },
				{ x: 150 + i, y: 150 + i },
			]
			await sleep(10)
		}
		await dispatchTouch(client, 'touchEnd', finalTouch)
		await sleep(10)
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(8)
	})

	test.fixme('minimap', () => {
		// todo
	})

	test.fixme('hand tool', () => {
		// todo
	})
})
