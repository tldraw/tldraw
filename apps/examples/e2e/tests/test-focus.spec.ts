import test, { expect } from '@playwright/test'
import { Editor } from 'tldraw'

declare const EDITOR_A: Editor
declare const EDITOR_B: Editor
declare const EDITOR_C: Editor

// We're just testing the events, not the actual results.

test.describe('Focus', () => {
	test('focus events', async ({ page }) => {
		await page.goto('http://localhost:5420/multiple/full')
		await page.waitForSelector('.tl-canvas')

		const EditorA = (await page.$(`.A`))!
		const EditorB = (await page.$(`.B`))!
		const EditorC = (await page.$(`.C`))!
		expect(EditorA).toBeTruthy()
		expect(EditorB).toBeTruthy()
		expect(EditorC).toBeTruthy()

		async function isOnlyFocused(id: 'A' | 'B' | 'C' | null) {
			let activeElement: string | null = null
			const isA = await EditorA.evaluate(
				(node) => document.activeElement === node || node.contains(document.activeElement)
			)
			const isB = await EditorB.evaluate(
				(node) => document.activeElement === node || node.contains(document.activeElement)
			)

			const isC = await EditorC.evaluate(
				(node) => document.activeElement === node || node.contains(document.activeElement)
			)

			activeElement = isA ? 'A' : isB ? 'B' : isC ? 'C' : null

			expect(
				activeElement,
				`Active element should have been ${id}, but was ${activeElement ?? 'null'} instead`
			).toBe(id)

			await page.evaluate(
				({ id }) => {
					if (
						!(
							EDITOR_A.getInstanceState().isFocused === (id === 'A') &&
							EDITOR_B.getInstanceState().isFocused === (id === 'B') &&
							EDITOR_C.getInstanceState().isFocused === (id === 'C')
						)
					) {
						throw Error('isFocused is not correct')
					}
				},
				{ id }
			)
		}

		// Component A has autofocus
		// Component B does not
		// Component C does not
		// Component B and C share persistence id

		await (await page.$('body'))?.click()

		await isOnlyFocused('A')

		await EditorA.click()

		await isOnlyFocused('A')

		await EditorA.click()

		await isOnlyFocused('A')

		await EditorB.click()

		await isOnlyFocused('B')

		// Escape does not break focus
		await page.keyboard.press('Escape')

		await isOnlyFocused('B')
	})

	test('kbds when not focused', async ({ page }) => {
		await page.goto('http://localhost:5420/multiple/full')
		await page.waitForSelector('.tl-canvas')

		// Should not have any shapes on the page
		expect(await page.evaluate(() => EDITOR_A.getCurrentPageShapes().length)).toBe(0)

		const EditorA = (await page.$(`.A`))!
		await page.keyboard.press('r')
		await EditorA.click({ position: { x: 100, y: 100 } })

		// Should not have created a shape
		expect(await page.evaluate(() => EDITOR_A.getCurrentPageShapes().length)).toBe(1)

		const TextArea = page.getByTestId(`textarea`)
		await TextArea.focus()
		await page.keyboard.type('hello world')
		await page.keyboard.press('Control+A')
		await page.keyboard.press('Delete')

		// Should not have deleted the page
		expect(await page.evaluate(() => EDITOR_A.getCurrentPageShapes().length)).toBe(1)
	})

	test('kbds when focused', async ({ page }) => {
		await page.goto('http://localhost:5420/multiple/full')
		await page.waitForSelector('.tl-canvas')

		const EditorA = (await page.$(`.A`))!
		const EditorB = (await page.$(`.B`))!
		const EditorC = (await page.$(`.C`))!
		expect(EditorA).toBeTruthy()
		expect(EditorB).toBeTruthy()
		expect(EditorC).toBeTruthy()

		await (await page.$('body'))?.click()

		expect(await EditorA.$('.tlui-button[data-testid="tools.draw"][aria-checked="true"]')).toBe(
			null
		)
		expect(await EditorB.$('.tlui-button[data-testid="tools.draw"][aria-checked="true"]')).toBe(
			null
		)

		await page.keyboard.press('d')

		expect(await EditorA.$('.tlui-button[data-testid="tools.draw"][aria-checked="true"]')).not.toBe(
			null
		)
		expect(await EditorB.$('.tlui-button[data-testid="tools.draw"][aria-checked="true"]')).toBe(
			null
		)

		await EditorB.click()
		await page.waitForTimeout(100) // takes 30ms or so to focus
		await page.keyboard.press('d')

		expect(await EditorA.$('.tlui-button[data-testid="tools.draw"][aria-checked="true"]')).not.toBe(
			null
		)
		expect(await EditorB.$('.tlui-button[data-testid="tools.draw"][aria-checked="true"]')).not.toBe(
			null
		)
	})

	test('kbds after clicking on ui elements', async ({ page }) => {
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForSelector('.tl-canvas')

		const EditorA = (await page.$(`.tl-container`))!
		expect(EditorA).toBeTruthy()

		const drawButton = await EditorA.$('.tlui-button[data-testid="tools.draw"]')

		// select button should be selected, not the draw button
		expect(await EditorA.$('.tlui-button[data-testid="tools.draw"][aria-checked="true"]')).toBe(
			null
		)

		await drawButton?.click()

		// draw button should be selected now
		expect(await EditorA.$('.tlui-button[data-testid="tools.draw"][aria-checked="true"]')).not.toBe(
			null
		)

		await page.keyboard.press('v')

		// select button should be selected again
		expect(await EditorA.$('.tlui-button[data-testid="tools.draw"][aria-checked="true"]')).toBe(
			null
		)
	})

	test('still focuses text after clicking on style button', async ({ page }) => {
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForSelector('.tl-canvas')

		const EditorA = (await page.$(`.tl-container`))!
		expect(EditorA).toBeTruthy()

		// Create a new note, text should be focused
		await page.keyboard.press('n')
		await (await page.$('body'))?.click()
		await page.waitForSelector('.tl-shape')

		const blueButton = await page.$('.tlui-button[data-testid="style.color.blue"]')
		await blueButton?.dispatchEvent('pointerdown')
		await blueButton?.click()
		await blueButton?.dispatchEvent('pointerup')

		// Text should still be focused.
		expect(await page.evaluate(() => document.activeElement?.nodeName === 'TEXTAREA')).toBe(true)
	})

	// test('edit->edit, focus stays in the text areas when going from shape-to-shape', async ({
	// 	page,
	// }) => {
	// 	await page.goto('http://localhost:5420/end-to-end')
	// 	await page.waitForSelector('.tl-canvas')

	// 	const EditorA = (await page.$(`.tl-container`))!
	// 	expect(EditorA).toBeTruthy()

	// 	// Create a new note, text should be focused
	// 	await page.keyboard.press('n')
	// 	await (await page.$('body'))?.click()
	// 	await page.waitForSelector('.tl-shape')
	// 	await page.keyboard.type('test')

	// 	// create new note next to it
	// 	await page.keyboard.press('Tab')

	// 	await (await page.$('body'))?.click()

	// 	// First note's textarea should be focused.
	// 	expect(await EditorA.evaluate(() => !!document.querySelector('.tl-shape textarea:focus'))).toBe(
	// 		true
	// 	)
	// })
})
