import { expect, test } from '@playwright/test'
import type { App } from '@tldraw/tldraw'
import { sleep } from '../shared-e2e'

declare const app: App

test.describe('TLDraw', () => {
	test.afterEach(async ({ page }) => {
		await page.evaluate(async () => {
			app.selectAll()
			app.deleteShapes()
		})
	})

	test('add a square', async ({ page }) => {
		await page.goto('http://localhost:5420/')

		await sleep(500)

		await page.keyboard.press('r') // select rectangle

		expect(await page.evaluate(() => app.root.path.value)).toBe('root.geo.idle')

		await page.mouse.move(200, 200)
		await page.mouse.down()

		expect(await page.evaluate(() => app.root.path.value)).toBe('root.geo.pointing')

		await page.mouse.move(300, 300)

		expect(await page.evaluate(() => app.root.path.value)).toBe('root.select.resizing')

		await page.mouse.up()
		await sleep(100)

		expect(await page.evaluate(() => app.root.path.value)).toBe('root.select.idle')

		expect(await page.evaluate(() => app.shapesArray.length)).toBe(1)

		// await expect(page).toHaveScreenshot({
		// 	fullPage: true,
		// })
	})
})
