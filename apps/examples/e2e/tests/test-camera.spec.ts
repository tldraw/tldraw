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

	test('pinching on trackpad', async ({ page, isMobile }) => {
		// pinching on trackpad is the same event as ctrl+scrollwheel
		test.skip(isMobile)
		const { mouse, keyboard } = page
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(1)
		await keyboard.down('Control')
		await mouse.wheel(0, 14)
		await keyboard.up('Control')
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(0.9)
	})

	test.only('pinching on touchscreen', async ({ page, isMobile }) => {
		test.skip(!isMobile)

		client = await page.context().newCDPSession(page)

		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(1)
		await page.evaluate(() => editor.updateInstanceState({ isGridMode: true }))

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
