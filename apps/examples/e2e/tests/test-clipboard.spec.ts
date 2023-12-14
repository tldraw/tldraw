import test, { expect } from '@playwright/test'
import { Editor } from '@tldraw/tldraw'
import { setup } from '../shared-e2e'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

declare const editor: Editor

/**
 * These tests are skipped. They are here to show how to use the clipboard
 * in tests. The clipboard is not really supported in playwright, so until
 * we figure out a way to do it (or until it is supported propertly), we've
 * had to skip these tests.
 */
test.describe.skip('clipboard tests', () => {
	test.beforeEach(setup)

	test('copy and paste from keyboard shortcut', async ({ page }) => {
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(1)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)

		await page.keyboard.down('Control')
		await page.keyboard.press('KeyC')
		await sleep(100)
		await page.keyboard.press('KeyV')
		await page.keyboard.up('Control')

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(2)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)
	})

	test('copy and paste from main menu', async ({ page }) => {
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(1)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)

		await page.getByTestId('main.menu').click()
		await page.getByTestId('menu-item.edit').click()
		await page.getByTestId('menu-item.copy').click()
		await sleep(100)
		await page.getByTestId('main.menu').click()
		await page.getByTestId('menu-item.edit').click()
		await page.getByTestId('menu-item.paste').click()

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(2)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)
	})

	test('copy and paste from context menu', async ({ page }) => {
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(1)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)

		await page.mouse.click(100, 100, { button: 'right' })
		await page.getByTestId('menu-item.copy').click()
		await sleep(100)
		await page.mouse.move(200, 200)
		await page.mouse.click(100, 100, { button: 'right' })
		await page.getByTestId('menu-item.paste').click()

		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(2)
		expect(await page.evaluate(() => editor.getSelectedShapes().length)).toBe(1)
	})
})
