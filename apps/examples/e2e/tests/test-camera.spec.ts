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

	test.only('panning', async ({ isMobile, page, toolbar }) => {
		test.skip(!isMobile)
		client = await page.context().newCDPSession(page)

		/*
		// This just makes a rectangle so it's easier to see the panning 
		await toolbar.moreToolsButton.click()
		const rectangle = toolbar.popOverTools.popoverRectangle
		await rectangle.click()
		await page.mouse.click(50, 50) */

		expect(await page.evaluate(() => editor.inputs.currentPagePoint)).toEqual({
			x: 50,
			y: 50,
			z: 0,
		})
		await dispatchTouch(client, 'touchStart', [
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
		])
		for (let i = 100; i > 0; i--) {
			await dispatchTouch(client, 'touchMove', [
				{ x: 100 + i * 10, y: 100 + i * 10 },
				{ x: 200 + i * 10, y: 200 + i * 10 },
			])
			await sleep(10)
		}
		expect(await page.evaluate(() => editor.inputs.currentPagePoint.x)).toBeCloseTo(144, 0)
	})

	test('pinching', async ({ page, isMobile }) => {
		// This test doesn't yet use touch events, it only tests punching on the trackpad
		// A pinch on the trackpad is the same as a ctrl+scrollwheel
		test.skip(isMobile)
		const { mouse, keyboard } = page
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(1)
		await keyboard.down('Control')
		await mouse.wheel(0, 14)
		await keyboard.up('Control')
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(0.9)
	})

	test.fixme('minimap', () => {
		// todo
	})

	test.fixme('hand tool', () => {
		// todo
	})
})
