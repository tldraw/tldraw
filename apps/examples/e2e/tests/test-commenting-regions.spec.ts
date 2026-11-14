import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'

test.describe('commenting regions', () => {
	test.beforeEach(async ({ page, isMobile }) => {
		// Region handles are a pointer-hover affordance.
		if (isMobile) test.skip()
		await page.goto('http://localhost:5420/comment-regions/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('scrolling the camera mid-resize keeps the region corner under the pointer', async ({
		page,
	}) => {
		// The example seeds a region thread; its handles show while the pointer is inside it.
		const pin = page.locator('.tlui-cmt-canvas-pin__marker')
		const pinBox = (await pin.boundingBox())!
		await page.mouse.move(pinBox.x - 60, pinBox.y - 20)
		const handles = page.locator('.tlui-cmt-canvas-region-handle')
		await expect(handles).toHaveCount(3)

		// The top-left handle sits nearest the page origin.
		const boxes = await Promise.all((await handles.all()).map((h) => h.boundingBox()))
		const topLeft = boxes.reduce((a, b) => (a!.x + a!.y <= b!.x + b!.y ? a : b))!
		const hx = topLeft.x + topLeft.width / 2
		const hy = topLeft.y + topLeft.height / 2
		const region = page.locator('.tlui-cmt-canvas-region').first()

		await page.mouse.move(hx, hy)
		await page.mouse.down()
		await page.mouse.move(hx - 40, hy - 30, { steps: 5 })
		const midResize = (await region.boundingBox())!
		await page.mouse.wheel(0, 120)
		// The pointer stayed put on screen, so the dragged corner does too while the rest of the
		// region scrolls with the page: its top edge holds, its height shrinks by the scroll.
		await expect.poll(async () => Math.round((await region.boundingBox())!.y - midResize.y)).toBe(0)
		await expect
			.poll(async () => Math.round(midResize.height - (await region.boundingBox())!.height))
			.toBe(120)
		await page.mouse.up()
	})
})
