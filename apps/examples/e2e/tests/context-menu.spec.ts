import test, { Page, expect } from '@playwright/test'
import { setupPage, setupPageWithShapes } from '../shared-e2e'

declare const __tldraw_ui_event: { name: string }

// We're just testing the events, not the actual results.

let page: Page

test.describe('Context menu', async () => {
	test.beforeEach(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
		await setupPageWithShapes(page)
	})

	test('distribute horizontal', async () => {
		// distribute horizontal
		await page.keyboard.press('Control+a')
		await page.mouse.click(200, 200, { button: 'right' })
		await page.getByTestId('context-menu-sub-trigger.arrange').click()
		await page.getByTestId('context-menu.distribute-horizontal').focus()
		await page.keyboard.press('Enter')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'distribute-shapes',
			data: { operation: 'horizontal', source: 'context-menu' },
		})
	})

	test('distribute vertical', async () => {
		// distribute vertical — Shift+Alt+V
		await page.keyboard.press('Control+a')
		await page.mouse.click(200, 200, { button: 'right' })
		await page.getByTestId('context-menu-sub-trigger.arrange').click()
		await page.getByTestId('context-menu.distribute-vertical').focus()
		await page.keyboard.press('Enter')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'distribute-shapes',
			data: { operation: 'vertical', source: 'context-menu' },
		})
	})
})
