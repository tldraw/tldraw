import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'

/**
 * The overlay draws a thread through one of several overlapping slots (cluster fade nodes, orphan
 * threads, held threads, the open-thread slot). Whatever the slot, an open thread must mount its
 * popover exactly once. A freshly placed comment is an "orphan" — added after the cluster model was
 * built, so it renders as a plain pin — which exercises the orphan/open-slot overlap. This guards
 * the invariant that the overlay never double-mounts an open thread's popover.
 */
test.describe('commenting render dedup', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:5420/commenting/full')
		await page.waitForSelector('.tl-canvas')
		await page.locator('.tl-container').focus()
	})

	test('opening a loose (orphan) comment pin mounts exactly one popover', async ({
		page,
		isMobile,
	}) => {
		if (isMobile) test.skip()

		// Place a comment — added after mount, so it renders as a loose orphan pin.
		const commentTool = page.getByTestId('quick-actions.comment')
		await commentTool.click()
		await expect(commentTool).toHaveAttribute('aria-pressed', 'true')
		await page.mouse.click(400, 300)
		await page.keyboard.type('orphan pin')
		await page.keyboard.press('Enter')

		// Wait for the pin to commit before dismissing — Escape would otherwise race the async
		// placement and cancel the pending composer.
		const pin = page.locator('.tlui-cmt-canvas-pin__marker')
		await expect(pin).toHaveCount(1)
		await page.keyboard.press('Escape')
		await expect(pin).toHaveAttribute('aria-expanded', 'false')

		// Open it: exactly one popover, no matter which slots could lay claim to this thread.
		await pin.click()
		await expect(pin).toHaveAttribute('aria-expanded', 'true')
		await expect(page.locator('.tlui-cmt-canvas-popover')).toHaveCount(1)
	})
})
