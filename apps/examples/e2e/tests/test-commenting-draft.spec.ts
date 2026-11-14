import { expect } from '@playwright/test'
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
		// The handle stays under the pointer, and the move cursor shows while dragging.
		await expect.poll(handleCenter).toEqual({ x: gx + 150, y: gy + 100 })
		await expect.poll(editorCursor).toBe('var(--tl-cursor-move)')
		// Scrolling the camera mid-drag keeps the draft under the pointer, as a shape drag does.
		const cameraTransform = () =>
			page.locator('.tl-html-layer.tl-shapes').evaluate((el) => (el as HTMLElement).style.transform)
		const cameraBefore = await cameraTransform()
		await page.mouse.wheel(0, 120)
		await expect.poll(cameraTransform).not.toBe(cameraBefore)
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
			.poll(async () => {
				const box = (await pin.boundingBox())!
				return { x: Math.round(box.x), y: Math.round(box.y) }
			})
			.toEqual({ x: Math.round(dropped.x), y: Math.round(dropped.y) })
	})

	test('placing hands back to select, and a canvas press dismisses the draft', async ({ page }) => {
		await page.getByTestId('quick-actions.comment').click()
		await page.mouse.click(400, 300)
		const composer = page.locator('.tlui-cmt-canvas-composer')
		await expect(composer).toBeVisible()
		await expect(page.getByTestId('tools.select')).toHaveAttribute('aria-pressed', 'true')

		await page.mouse.click(700, 500)
		await expect(composer).toHaveCount(0)
		await expect(page.locator('.tlui-cmt-canvas-pin__marker')).toHaveCount(0)
	})

	test('panning the camera with the middle button keeps the draft open', async ({
		page,
		isMobile,
	}) => {
		if (isMobile) test.skip()
		await page.getByTestId('quick-actions.comment').click()
		await page.mouse.click(400, 300)
		const composer = page.locator('.tlui-cmt-canvas-composer')
		await expect(composer).toBeVisible()

		await page.mouse.move(700, 500)
		await page.mouse.down({ button: 'middle' })
		await page.mouse.move(650, 450, { steps: 5 })
		await page.mouse.up({ button: 'middle' })
		await expect(composer).toBeVisible()
	})
})
