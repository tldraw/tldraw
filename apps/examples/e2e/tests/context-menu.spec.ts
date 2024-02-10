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
		await page.getByTestId('menu-item.arrange').click()
		await page.getByTestId('menu-item.distribute-horizontal').click()
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'distribute-shapes',
			data: { operation: 'horizontal', source: 'context-menu' },
		})
	})

	test('distribute vertical', async () => {
		// distribute vertical — Shift+Alt+V
		await page.keyboard.press('Control+a')
		await page.mouse.click(200, 200, { button: 'right' })
		await page.getByTestId('menu-item.arrange').click()
		await page.getByTestId('menu-item.distribute-vertical').click()
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'distribute-shapes',
			data: { operation: 'vertical', source: 'context-menu' },
		})
	})
})

test.describe('Delete bug', () => {
	test.beforeEach(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
	})

	test('delete bug without drag', async () => {
		await page.keyboard.press('r')
		await page.mouse.click(100, 100)
		await page.keyboard.press('Backspace')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'delete-shapes',
			data: { source: 'kbd' },
		})
	})

	test('delete bug with drag', async () => {
		await page.keyboard.press('r')
		await page.mouse.down()
		await page.mouse.move(100, 100)
		await page.mouse.up()
		await page.keyboard.press('Backspace')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'delete-shapes',
			data: { source: 'kbd' },
		})
	})
})
