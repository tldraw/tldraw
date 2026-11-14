import { Page, expect } from '@playwright/test'
import test from '../fixtures/fixtures'

// Open the thread of the one comment just posted, from its pin.
async function openPostedThread(page: Page) {
	const pin = page.locator('.tlui-cmt-canvas-pin__marker')
	await expect(pin).toHaveCount(1)
	if ((await pin.getAttribute('aria-expanded')) !== 'true') await pin.click()
	await expect(page.locator('.tlui-cmt-canvas-popover')).toBeVisible()
}

test.describe('commenting thread view', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:5420/commenting/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('a long comment clips with a see more / see less toggle', async ({ page }) => {
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
		// Clipped to its max height rather than its full content.
		const clipped = await body.evaluate((el) => ({
			height: el.clientHeight,
			maxHeight: parseFloat(getComputedStyle(el).maxHeight),
			overflows: el.scrollHeight > el.clientHeight,
		}))
		expect(clipped.overflows).toBe(true)
		expect(clipped.height).toBe(Math.round(clipped.maxHeight))

		await toggle.click()
		await expect(toggle).toHaveText('See less')
		expect((await body.boundingBox())!.height).toBeGreaterThan(clipped.height)

		await toggle.click()
		await expect(toggle).toHaveText('See more')
	})

	test('short comments have no toggle', async ({ page }) => {
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
