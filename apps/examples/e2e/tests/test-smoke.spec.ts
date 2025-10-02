import { expect } from '@playwright/test'
import { Editor, TLGeoShape } from 'tldraw'
import test from '../fixtures/fixtures'
import { getAllShapeTypes, setup } from '../shared-e2e'

declare const editor: Editor

test.describe('smoke tests', () => {
	test.beforeEach(setup)

	test('create a shape on the canvas', async ({ page }) => {
		await page.keyboard.press('r')
		await page.mouse.move(10, 50)
		await page.mouse.down()
		await page.mouse.up()
		await page.keyboard.press('r')
		await page.mouse.move(10, 250)
		await page.mouse.down()
		await page.mouse.move(100, 350)
		await page.mouse.up()
		expect(await getAllShapeTypes(page)).toEqual(['geo', 'geo'])
	})

	test('undo and redo', async ({ page }) => {
		// buttons should be disabled when there is no history
		expect(page.getByTestId('quick-actions.undo')).toBeDisabled()
		expect(page.getByTestId('quick-actions.redo')).toBeDisabled()

		// create a shape
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.move(200, 200)
		await page.mouse.up()

		expect(await getAllShapeTypes(page)).toEqual(['geo'])

		// We should have an undoable shape
		expect(page.getByTestId('quick-actions.undo')).not.toBeDisabled()
		expect(page.getByTestId('quick-actions.redo')).toBeDisabled()

		// Click the undo button to undo the shape
		await page.getByTestId('quick-actions.undo').click()

		expect(await getAllShapeTypes(page)).toEqual([])
		expect(page.getByTestId('quick-actions.undo')).toBeDisabled()
		expect(page.getByTestId('quick-actions.redo')).not.toBeDisabled()

		// Click the redo button to redo the shape
		await page.getByTestId('quick-actions.redo').click()

		expect(await getAllShapeTypes(page)).toEqual(['geo'])
		expect(await page.getByTestId('quick-actions.undo').isDisabled()).not.toBe(true)
		expect(await page.getByTestId('quick-actions.redo').isDisabled()).toBe(true)
	})

	test('style panel + undo and redo squashing', async ({ page, toolbar }) => {
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()
		expect(await getAllShapeTypes(page)).toEqual(['geo'])

		const getSelectedShapeColor = async () =>
			await page.evaluate(() => (editor.getSelectedShapes()[0] as TLGeoShape).props.color)

		// change style
		expect(await getSelectedShapeColor()).toBe('black')

		// when on a mobile device...
		const hasMobileMenu = await toolbar.mobileStylesButton.isVisible()

		if (hasMobileMenu) {
			// open the style menu
			await toolbar.mobileStylesButton.click()
		}

		// Click the light-blue color
		await page.getByTestId('style.color.light-blue').click()
		expect(await getSelectedShapeColor()).toBe('light-blue')

		// now drag from blue to orange; the color should change as we drag
		// but when we undo, we should ignore the colors which were changed
		// before the final color was chosen; i.e. the history should think
		// the color went from black to light blue to orange, though the shape
		// actually changed from black to light blue to blue to light blue to
		// yellow and then to orange.

		// start a pointer down over the blue color button
		await page.getByTestId('style.color.blue').hover()
		await page.mouse.down()
		expect(await getSelectedShapeColor()).toBe('blue')

		// now move across to the other colors before releasing
		await page.getByTestId('style.color.light-blue').hover()
		expect(await getSelectedShapeColor()).toBe('light-blue')

		await page.getByTestId('style.color.yellow').hover()
		expect(await getSelectedShapeColor()).toBe('yellow')

		await page.getByTestId('style.color.orange').hover()
		expect(await getSelectedShapeColor()).toBe('orange')

		await page.mouse.up()

		// Now undo and redo
		const undo = page.getByTestId('quick-actions.undo')
		const redo = page.getByTestId('quick-actions.redo')

		await undo.click() // orange -> light blue
		expect(await getSelectedShapeColor()).toBe('light-blue') // skipping squashed colors!

		await redo.click() // light blue -> orange
		expect(await getSelectedShapeColor()).toBe('orange') // skipping squashed colors!

		await undo.click() // orange -> light blue
		await undo.click() // light blue -> black
		expect(await getSelectedShapeColor()).toBe('black')

		await redo.click() // black -> light blue
		await redo.click() // light-blue -> orange

		expect(await page.getByTestId('quick-actions.undo').isDisabled()).not.toBe(true)
		expect(await page.getByTestId('quick-actions.redo').isDisabled()).toBe(true)
	})
})
