import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'
import { setupOrReset } from '../shared-e2e'

test.describe('more rich text', () => {
	test.beforeEach(setupOrReset)

	test('Double click from select tool to create and edit text on the canvas', async ({
		page,
		toolbar,
	}) => {
		await toolbar.tools.select.click()
		await page.mouse.dblclick(150, 150)
		// Wait for the contenteditable to actually be focused, not just visible.
		// The editor focuses on a deferred timeout after mounting, so typing as
		// soon as the element is visible drops the first keystroke.
		await page.waitForFunction(
			() => document.activeElement === document.querySelector('.tl-shape [contenteditable]')
		)
		await page.keyboard.type('id like to go to india')
		await expect(page.getByTestId('rich-text-area')).toHaveText('id like to go to india')
	})

	test('Click with text tool to create and edit text on the canvas', async ({ page, toolbar }) => {
		await toolbar.tools.text.click()
		await page.mouse.click(150, 150)
		// Wait for the contenteditable to actually be focused (not just visible)
		// so the first keystroke isn't dropped.
		await page.waitForFunction(
			() => document.activeElement === document.querySelector('.tl-shape [contenteditable]')
		)
		await page.keyboard.type('Live in a big white house in the forest')
		await expect(page.getByTestId('rich-text-area')).toHaveText(
			'Live in a big white house in the forest'
		)

		// expect canvas overlays to be visible (indicators render there when editing)
		const canvasIndicator = page.locator('.tl-canvas-overlays')
		await expect(canvasIndicator).toBeVisible()
	})

	test('Click and drag with text tool to create and edit fixed-width text on the canvas', async ({
		page,
		toolbar,
	}) => {
		await toolbar.tools.text.click()
		await page.mouse.move(150, 150)
		await page.mouse.down()
		await page.mouse.move(350, 150, { steps: 10 })
		await page.mouse.up()
		// Wait for the contenteditable to actually be focused (not just visible)
		// so the first keystroke isn't dropped.
		await page.waitForFunction(
			() => document.activeElement === document.querySelector('.tl-shape [contenteditable]')
		)
		await page.keyboard.type('Drink gin and tonic and play a grand piano')
		await expect(page.getByTestId('rich-text-area')).toHaveText(
			'Drink gin and tonic and play a grand piano'
		)

		// expect canvas overlays to be visible (indicators render there when editing)
		const canvasIndicator = page.locator('.tl-canvas-overlays')
		await expect(canvasIndicator).toBeVisible()
	})
})
