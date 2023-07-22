import test, { expect } from '@playwright/test'

declare const __tldraw_editor_events: any[]

// We're just testing the events, not the actual results.

test.describe('Focus', () => {
	test('focus events', async ({ page }) => {
		await page.goto('http://localhost:5420/multiple')
		await page.waitForSelector('.tl-canvas')

		// Component A has autofocus
		// Component B does not

		const EditorA = (await page.$(`.A`))!
		const EditorB = (await page.$(`.B`))!
		expect(EditorA).toBeTruthy()
		expect(EditorB).toBeTruthy()

		await (await page.$('body'))?.click()

		expect(await EditorA.evaluate((node) => document.activeElement === node)).toBe(true)
		expect(await EditorB.evaluate((node) => document.activeElement === node)).toBe(false)

		await (await page.$('body'))?.click()

		expect(await EditorA.evaluate((node) => document.activeElement === node)).toBe(false)
		expect(await EditorB.evaluate((node) => document.activeElement === node)).toBe(false)

		await EditorA.click()
		expect(await EditorA.evaluate((node) => document.activeElement === node)).toBe(true)
		expect(await EditorB.evaluate((node) => document.activeElement === node)).toBe(false)

		await EditorA.click()
		expect(await EditorA.evaluate((node) => document.activeElement === node)).toBe(false)
		expect(await EditorB.evaluate((node) => document.activeElement === node)).toBe(false)
		expect(await EditorA.evaluate((node) => node.contains(document.activeElement))).toBe(true)

		await EditorB.click()
		expect(await EditorA.evaluate((node) => document.activeElement === node)).toBe(false)
		expect(await EditorB.evaluate((node) => document.activeElement === node)).toBe(false)
		expect(await EditorA.evaluate((node) => node.contains(document.activeElement))).toBe(true)

		// Escape does not break focus
		await page.keyboard.press('Escape')
		expect(await EditorA.evaluate((node) => node.contains(document.activeElement))).toBe(true)
	})

	test('kbds when focused', async ({ page }) => {
		await page.goto('http://localhost:5420/multiple')
		await page.waitForSelector('.tl-canvas')

		const EditorA = (await page.$(`.A`))!
		const EditorB = (await page.$(`.B`))!
		expect(EditorA).toBeTruthy()
		expect(EditorB).toBeTruthy()

		await (await page.$('body'))?.click()

		expect(await EditorA.evaluate((node) => document.activeElement === node)).toBe(true)
		expect(await EditorB.evaluate((node) => document.activeElement === node)).toBe(false)

		expect(await EditorA.$('.tlui-button[data-testid="tools.draw"][data-state="selected"]')).toBe(
			null
		)
		expect(await EditorB.$('.tlui-button[data-testid="tools.draw"][data-state="selected"]')).toBe(
			null
		)

		await page.keyboard.press('d')

		expect(
			await EditorA.$('.tlui-button[data-testid="tools.draw"][data-state="selected"]')
		).not.toBe(null)
		expect(await EditorB.$('.tlui-button[data-testid="tools.draw"][data-state="selected"]')).toBe(
			null
		)

		await EditorB.click()
		await page.waitForTimeout(100) // takes 30ms or so to focus
		await page.keyboard.press('d')

		expect(
			await EditorA.$('.tlui-button[data-testid="tools.draw"][data-state="selected"]')
		).not.toBe(null)
		expect(
			await EditorB.$('.tlui-button[data-testid="tools.draw"][data-state="selected"]')
		).not.toBe(null)
	})

	test('kbds after clicking on ui elements', async ({ page }) => {
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForSelector('.tl-canvas')

		const EditorA = (await page.$(`.tl-container`))!
		expect(EditorA).toBeTruthy()

		const drawButton = await EditorA.$('.tlui-button[data-testid="tools.draw"]')

		// select button should be selected, not the draw button
		expect(await EditorA.$('.tlui-button[data-testid="tools.draw"][data-state="selected"]')).toBe(
			null
		)

		await drawButton?.click()

		// draw button should be selected now
		expect(
			await EditorA.$('.tlui-button[data-testid="tools.draw"][data-state="selected"]')
		).not.toBe(null)

		await page.keyboard.press('v')

		// select button should be selected again
		expect(await EditorA.$('.tlui-button[data-testid="tools.draw"][data-state="selected"]')).toBe(
			null
		)
	})
})
