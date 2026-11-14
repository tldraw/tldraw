import { Page, expect } from '@playwright/test'
import test from '../fixtures/fixtures'

test.describe('commenting draft composer', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:5420/commenting/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('dragging the draft pin moves the comment before it is posted', async ({
		page,
		isMobile,
	}) => {
		// On mobile the composer floats free of its point, so there's no pin to drag.
		if (isMobile) test.skip()

		await page.getByTestId('quick-actions.comment').click()
		await page.mouse.click(400, 300)
		const input = page.locator('.tlui-cmt-canvas-composer [contenteditable="true"].tlui-cmt-input')
		await expect(input).toBeFocused()
		await page.keyboard.type('moved draft')

		// The editor's cursor, as it writes it onto the container.
		const editorCursor = () =>
			page
				.locator('.tl-container')
				.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--tl-cursor'))
		const handle = page.locator('.tlui-cmt-canvas-composer__handle')
		const handleCenter = async () => {
			const box = (await handle.boundingBox())!
			return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
		}
		// Grab the handle only once the composer has settled where it opened: measuring while it is
		// still being placed is what made this test flaky.
		let settled = await handleCenter()
		await expect
			.poll(async () => {
				const next = await handleCenter()
				const same = next.x === settled.x && next.y === settled.y
				settled = next
				return same
			})
			.toBe(true)
		const { x: gx, y: gy } = settled

		await page.mouse.move(gx, gy)
		await page.mouse.down()
		await page.mouse.move(gx + 75, gy + 50, { steps: 5 })
		await page.mouse.move(gx + 150, gy + 100, { steps: 5 })
		// The handle stays under the pointer, and the move cursor holds for the whole drag.
		await expect.poll(handleCenter).toEqual({ x: gx + 150, y: gy + 100 })
		await expect.poll(editorCursor).toBe('var(--tl-cursor-move)')
		// Scrolling the camera mid-drag keeps the draft under the pointer, as a shape drag does.
		await page.mouse.wheel(0, 120)
		await expect.poll(handleCenter).toEqual({ x: gx + 150, y: gy + 100 })
		await page.mouse.up()
		await expect.poll(editorCursor).toBe('var(--tl-cursor-default)')

		// The composer kept its text, and kept focus for typing.
		await expect(input).toHaveText('moved draft')
		await expect(input).toBeFocused()

		// Posting places the pin where the draft was dropped: the draft's pin becomes the real one.
		const dropped = (await handle.boundingBox())!
		await page.keyboard.press('Enter')
		const pin = page.locator('.tlui-cmt-canvas-pin__marker')
		await expect(pin).toHaveCount(1)
		await expect
			.poll(async () => Math.round((await pin.boundingBox())!.x))
			.toBe(Math.round(dropped.x))
	})

	test('scrolling the camera mid-resize keeps the region corner under the pointer', async ({
		page,
		isMobile,
	}) => {
		if (isMobile) test.skip()
		await page.goto('http://localhost:5420/comment-regions/full')
		await page.waitForSelector('.tl-canvas')

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

// Open the thread of the one comment just posted, from its pin.
async function openPostedThread(page: Page) {
	const pin = page.locator('.tlui-cmt-canvas-pin__marker')
	await expect(pin).toHaveCount(1)
	if ((await pin.getAttribute('aria-expanded')) !== 'true') await pin.click()
	await expect(page.locator('.tlui-cmt-canvas-popover')).toBeVisible()
}

test.describe('long comments', () => {
	test('clip to 10 lines with a see more / see less toggle', async ({ page }) => {
		await page.goto('http://localhost:5420/commenting/full')
		await page.waitForSelector('.tl-canvas')
		await page.getByTestId('quick-actions.comment').click()
		await page.mouse.click(400, 300)
		const input = page.locator('.tlui-cmt-canvas-composer [contenteditable="true"].tlui-cmt-input')
		await expect(input).toBeFocused()
		for (let i = 0; i < 14; i++) {
			await page.keyboard.type(`line ${i + 1}`)
			await page.keyboard.press('Shift+Enter')
		}
		await page.keyboard.type('line 15')
		await page.keyboard.press('Enter')
		await openPostedThread(page)

		const body = page.locator('.tlui-cmt-canvas-popover .tlui-cmt-collapsible')
		const toggle = page.locator('.tlui-cmt-canvas-popover .tlui-cmt-see-more')
		await expect(toggle).toHaveText('See more')
		const clipped = (await body.boundingBox())!.height
		expect(Math.round(clipped)).toBe(168)

		await toggle.click()
		await expect(toggle).toHaveText('See less')
		expect((await body.boundingBox())!.height).toBeGreaterThan(clipped)

		await toggle.click()
		await expect(toggle).toHaveText('See more')
	})

	test('short comments have no toggle', async ({ page }) => {
		await page.goto('http://localhost:5420/commenting/full')
		await page.waitForSelector('.tl-canvas')
		await page.getByTestId('quick-actions.comment').click()
		await page.mouse.click(400, 300)
		const input = page.locator('.tlui-cmt-canvas-composer [contenteditable="true"].tlui-cmt-input')
		await expect(input).toBeFocused()
		await page.keyboard.type('short')
		await page.keyboard.press('Enter')
		await openPostedThread(page)
		await expect(page.locator('.tlui-cmt-canvas-popover .tlui-cmt-text')).toBeVisible()
		await expect(page.locator('.tlui-cmt-canvas-popover .tlui-cmt-see-more')).toHaveCount(0)
	})
})
