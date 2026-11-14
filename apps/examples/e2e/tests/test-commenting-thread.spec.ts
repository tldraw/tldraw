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
		// Clamped short of its full content.
		const clipped = await body.evaluate((el) => ({
			height: el.clientHeight,
			overflows: el.scrollHeight > el.clientHeight,
		}))
		expect(clipped.overflows).toBe(true)

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

	test('copying across comments puts a clean transcript on the clipboard', async ({ page }) => {
		await page.getByTestId('quick-actions.comment').click()
		await page.mouse.click(400, 300)
		await page.keyboard.type('first')
		await page.keyboard.press('Enter')
		await openPostedThread(page)
		const reply = page.locator('.tlui-cmt-canvas-popover [contenteditable="true"].tlui-cmt-input')
		await reply.click()
		await page.keyboard.type('second')
		await page.keyboard.press('Enter')
		await expect(page.locator('.tlui-cmt-canvas-popover .tlui-cmt-text')).toHaveCount(2)

		// Select the whole comment list, then copy through the thread's own handler.
		const copied = await page.evaluate(() => {
			const list = document.querySelector('.tlui-cmt-canvas-popover .tlui-cmt-thread__list')!
			const range = document.createRange()
			range.selectNodeContents(list)
			const selection = document.getSelection()!
			selection.removeAllRanges()
			selection.addRange(range)
			const event = new ClipboardEvent('copy', {
				clipboardData: new DataTransfer(),
				bubbles: true,
				cancelable: true,
			})
			list.dispatchEvent(event)
			return {
				text: event.clipboardData!.getData('text/plain'),
				html: event.clipboardData!.getData('text/html'),
			}
		})
		const blocks = copied.text.split('\n\n')
		expect(blocks).toHaveLength(2)
		// Name, then an absolute time on the same line, then the body on its own line.
		expect(blocks[0]).toMatch(/^.+ • \d{1,2} \S+ \d{4} \d{2}:\d{2}\S*\nfirst$/)
		expect(blocks[1]).toMatch(/^.+ • \d{1,2} \S+ \d{4} \d{2}:\d{2}\S*\nsecond$/)
		expect(copied.html).toContain('<strong>')
	})

	test('copying part of one comment keeps the browser copy', async ({ page }) => {
		await page.getByTestId('quick-actions.comment').click()
		await page.mouse.click(400, 300)
		await page.keyboard.type('just this text')
		await page.keyboard.press('Enter')
		await openPostedThread(page)

		const handled = await page.evaluate(() => {
			const text = document.querySelector('.tlui-cmt-canvas-popover .tlui-cmt-text p')!
			const range = document.createRange()
			range.setStart(text.firstChild!, 5)
			range.setEnd(text.firstChild!, 9)
			const selection = document.getSelection()!
			selection.removeAllRanges()
			selection.addRange(range)
			const event = new ClipboardEvent('copy', {
				clipboardData: new DataTransfer(),
				bubbles: true,
				cancelable: true,
			})
			text.dispatchEvent(event)
			return event.defaultPrevented
		})
		expect(handled).toBe(false)
	})
})
