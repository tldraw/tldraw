import { expect } from '@playwright/test'
import { type Editor } from 'tldraw'
import test from '../fixtures/fixtures'
import { clickMenu, setup, sleep } from '../shared-e2e'

declare const editor: Editor

// these are skipped because they're flaky in CI :(
test.describe.skip('clipboard tests', () => {
	test.beforeEach(setup)

	test.beforeEach(async ({ page }) => {
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(1)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)
	})

	test('copy and paste from keyboard shortcut', async ({ page, isMac }) => {
		const modifier = isMac ? 'Meta' : 'Control'

		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyC')
		await sleep(100)
		await page.keyboard.press('KeyV')
		await page.keyboard.up(modifier)

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(2)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)
	})

	test('copy and paste from main menu', async ({ page }) => {
		await clickMenu(page, 'main-menu.edit.copy')
		await sleep(100)
		await clickMenu(page, 'main-menu.edit.paste')

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(2)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)
	})

	test('copy and paste from context menu', async ({ page }) => {
		await page.mouse.click(100, 100, { button: 'right' })
		await clickMenu(page, 'context-menu.copy')
		await sleep(100)
		await page.mouse.move(200, 200)
		await page.mouse.click(100, 100, { button: 'right' })
		await clickMenu(page, 'context-menu.paste')

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(2)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)
	})

	test('copy and paste png from context menu', async ({ page }) => {
		await page.mouse.click(100, 100, { button: 'right' })
		await clickMenu(page, 'context-menu.copy-as.copy-as-png')
		await sleep(100)

		await page.mouse.move(400, 400)
		await page.mouse.click(100, 100, { button: 'right' })
		await clickMenu(page, 'context-menu.paste')
		await sleep(100)

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(2)
		expect(await page.evaluate(() => editor.getOnlySelectedShape())).toMatchObject({
			type: 'image',
			props: { w: 264, h: 264 },
		})
		const imageWidth = await page
			.locator('.tl-image')
			.evaluate((img) => (img as HTMLImageElement).naturalWidth)
		expect(imageWidth).toBe(528)
	})

	test('copy png with context menu, paste with keyboard', async ({ page, isMac }) => {
		const modifier = isMac ? 'Meta' : 'Control'

		await page.mouse.click(100, 100, { button: 'right' })
		await clickMenu(page, 'context-menu.copy-as.copy-as-png')
		await sleep(100)

		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyV')
		await sleep(100)
		await page.keyboard.up(modifier)
		await sleep(100)

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(2)

		// image should come in at the same size (200x200 + padding)
		expect(await page.evaluate(() => editor.getOnlySelectedShape())).toMatchObject({
			type: 'image',
			props: { w: 264, h: 264 },
		})

		// but the actual image should be 2x that for retina displays
		const imageWidth = await page
			.locator('.tl-image')
			.evaluate((img) => (img as HTMLImageElement).naturalWidth)
		expect(imageWidth).toBe(528)
	})
})
