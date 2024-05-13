import { CDPSession, Page, expect } from '@playwright/test'
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

const multiTouchGesture = async ({
	start,
	end,
	steps,
}: {
	start: { x: number; y: number }[]
	end: { x: number; y: number }[]
	steps: number
}) => {
	const finger1 = { x: start[0].x, y: start[0].y }
	const finger2 = { x: start[1].x, y: start[1].x }
	const finalTouch = [finger1, finger2]

	await dispatchTouch(client, 'touchStart', [finger1, finger2])
	await sleep(10)

	// how far should the fingers move each step to reach the end point?
	const finger1StepDistance = {
		x: (end[0].x - start[0].x) / steps,
		y: (end[0].y - start[0].y) / steps,
	}
	const finger2StepDistance = {
		x: (end[1].x - start[1].x) / steps,
		y: (end[1].y - start[1].y) / steps,
	}

	for (let i = 1; i < steps; i++) {
		await dispatchTouch(client, 'touchMove', [
			{ x: finger1.x + i * finger1StepDistance.x, y: finger1.y + i * finger1StepDistance.y },
			{ x: finger2.x + i * finger2StepDistance.x, y: finger2.y + i * finger2StepDistance.y },
		])

		await sleep(10)
	}

	await dispatchTouch(client, 'touchEnd', finalTouch)
	await sleep(10)
}

const scrollZoom = async ({
	page,
	currentZoomLevel,
	zoomDirection,
	steps,
}: {
	page: Page
	currentZoomLevel: number
	zoomDirection: 'in' | 'out'
	steps: number
}) => {
	page.keyboard.down('Control')
	// zooming with the scroll wheel is capped within the editor to make sure it's consistent between browsers,
	//scrolling further than 15px per event doesn't have any effect
	for (let i = 0; i < steps; i++) {
		await page.mouse.wheel(0, zoomDirection === 'out' ? -15 : 15)
	}
	page.keyboard.up('Control')
	// scrolling 15px on the mouse wheel changes the zoom level by 10%
	const expectedZoomLevel =
		zoomDirection === 'out' ? currentZoomLevel * 1.1 ** steps : currentZoomLevel / 1.1 ** steps

	return expectedZoomLevel
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

		// the fewer steps you use, the faster the pan. So the ratio of pixels moved is not one-to-one.
		await multiTouchGesture({
			start: [
				{ x: 50, y: 50 },
				{ x: 100, y: 100 },
			],
			end: [
				{ x: 100, y: 100 },
				{ x: 150, y: 150 },
			],
			steps: 50,
		})

		// With current panning speed, the above gesture moves the camera by 36px on each axis
		expect(
			await page.evaluate(() => [
				editor.inputs.currentPagePoint.x,
				editor.inputs.currentPagePoint.y,
			])
		).toStrictEqual([86, 86])
	})

	test('pinching on trackpad', async ({ page, isMobile }) => {
		// pinching on trackpad is the same event as ctrl+scrollwheel
		test.skip(isMobile)
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(1)

		let expectedZoomLevel = await scrollZoom({
			page,
			currentZoomLevel: 1,
			zoomDirection: 'in',
			steps: 3,
		})
		// toBeCloseTo is used to avoid floating point errors
		expect(await page.evaluate(() => editor.getZoomLevel())).toBeCloseTo(expectedZoomLevel, 1)

		expectedZoomLevel = await scrollZoom({
			page,
			currentZoomLevel: expectedZoomLevel,
			zoomDirection: 'out',
			steps: 3,
		})
		expect(await page.evaluate(() => editor.getZoomLevel())).toBeCloseTo(expectedZoomLevel, 1)
	})

	test('pinching on touchscreen', async ({ page, isMobile }) => {
		test.skip(!isMobile)

		client = await page.context().newCDPSession(page)

		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(1)

		// zoom out
		await multiTouchGesture({
			start: [
				{ x: 100, y: 100 },
				{ x: 200, y: 200 },
			],
			end: [
				{ x: 149, y: 149 },
				{ x: 151, y: 151 },
			],
			steps: 50,
		})
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(0.1)

		// now zoom in
		await multiTouchGesture({
			start: [
				{ x: 149, y: 149 },
				{ x: 151, y: 151 },
			],
			end: [
				{ x: 0, y: 0 },
				{ x: 300, y: 300 },
			],
			steps: 50,
		})
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(8)
	})

	test.fixme('minimap', async () => {
		// todo
	})

	test.fixme('hand tool', async () => {
		// todo
	})
})
