import { CDPSession, Page, expect } from '@playwright/test'
import { type Editor } from 'tldraw'
import test from '../fixtures/fixtures'
import { setupOrReset, sleep } from '../shared-e2e'

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
	const finger2 = { x: start[1].x, y: start[1].y }
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

test.describe('camera', () => {
	test.beforeEach(setupOrReset)

	test('panning', async ({ isMobile, page }) => {
		test.skip(!isMobile)
		client = await page.context().newCDPSession(page)
		expect(await page.evaluate(() => editor.inputs.getCurrentPagePoint())).toEqual({
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

		// With current panning speed, the above gesture moves the camera by ~36px on each axis.
		// Use a tolerance to avoid brittleness across engines/emulation.
		const [x, y] = await page.evaluate(() => {
			const point = editor.inputs.getCurrentPagePoint()
			return [point.x, point.y]
		})
		expect(x).toBeGreaterThan(80)
		expect(x).toBeLessThan(95)
		expect(y).toBeGreaterThan(80)
		expect(y).toBeLessThan(95)
	})

	test('pinching on trackpad', async ({ page, isMobile }) => {
		// Test is flaky, disabling.
		test.skip(true)

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
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(0.05)

		// now zoom in
		await multiTouchGesture({
			start: [
				{ x: 200, y: 200 },
				{ x: 200, y: 200 },
			],
			end: [
				{ x: 0, y: 0 },
				{ x: 400, y: 400 },
			],
			steps: 50,
		})
		expect(await page.evaluate(() => editor.getZoomLevel())).toBe(8)
	})

	test('two-finger pinch does not change the selection', async ({ page, isMobile }) => {
		test.skip(!isMobile)

		client = await page.context().newCDPSession(page)

		// Finger 1 lands here; finger 2 above it. Both are kept inside the mobile
		// viewport so the gesture registers.
		const f1 = { x: 196, y: 470, id: 0 }
		const f2 = { x: 196, y: 300, id: 1 }

		// Shape "a" (selected, off to the side) plus shape "b" placed directly under
		// finger 1, so the first finger's pointer_down selects it.
		await page.evaluate((f) => {
			const p = editor.screenToPage({ x: f.x, y: f.y })
			editor.createShapes([
				{
					id: 'shape:e2eA',
					type: 'geo',
					x: -1000,
					y: -1000,
					props: { w: 100, h: 100, fill: 'solid' },
				},
				{
					id: 'shape:e2eB',
					type: 'geo',
					x: p.x - 60,
					y: p.y - 60,
					props: { w: 120, h: 120, fill: 'solid' },
				},
			] as any)
			editor.setSelectedShapes(['shape:e2eA'] as any)
		}, f1)

		expect(await page.evaluate(() => editor.getSelectedShapeIds())).toEqual(['shape:e2eA'])

		// Finger 1 down on shape b — through the real touch/pointer pipeline this
		// changes the selection to b.
		await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [f1] })
		await sleep(30)
		expect(await page.evaluate(() => editor.getSelectedShapeIds())).toEqual(['shape:e2eB'])

		// Finger 2 joins, then both fingers move apart to pinch-zoom, then lift.
		await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [f1, f2] })
		await sleep(30)
		const steps = 12
		for (let i = 1; i <= steps; i++) {
			await client.send('Input.dispatchTouchEvent', {
				type: 'touchMove',
				touchPoints: [
					{ x: f1.x, y: f1.y + i * 8, id: 0 }, // finger 1 moves down
					{ x: f2.x, y: f2.y - i * 8, id: 1 }, // finger 2 moves up
				],
			})
			await sleep(10)
		}
		await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
		await sleep(100)

		// The incidental selection of b is rolled back to the pre-gesture selection.
		expect(await page.evaluate(() => editor.getSelectedShapeIds())).toEqual(['shape:e2eA'])
		// ...and the pinch really did zoom (sanity check that a pinch happened).
		expect(await page.evaluate(() => editor.getZoomLevel())).not.toBe(1)
	})

	test.fixme('minimap', async () => {
		// todo
	})

	test.fixme('hand tool', async () => {
		// todo
	})
})
