import test, { expect } from '@playwright/test'
import { App, TLGeoShape } from '@tldraw/tldraw'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

declare const app: App

test.describe('smoke tests', () => {
	test.beforeEach(async ({ page, context }) => {
		await page.goto('http://localhost:5420/')
		await page.waitForSelector('.tl-canvas')
		await context.grantPermissions(['clipboard-read', 'clipboard-write'])
	})

	test('create a shape on the canvas', async ({ page }) => {
		await page.mouse.move(10, 50)

		// start on an empty canvas
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(0)
		expect(await page.evaluate(() => app.selectedIds.length)).toBe(0)

		// start in select
		expect(await page.evaluate(() => app.root.path.value)).toBe('root.select.idle')

		// press r to select tool
		await page.keyboard.press('r')
		expect(await page.evaluate(() => app.root.path.value)).toBe('root.geo.idle')

		// click to enter pointing
		await page.mouse.down()
		expect(await page.evaluate(() => app.root.path.value)).toBe('root.geo.pointing')

		// release from pointing to create shape
		await page.mouse.up()
		expect(await page.evaluate(() => app.root.path.value)).toBe('root.select.idle')
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(1)

		// The shape should be selected
		expect(await page.evaluate(() => app.selectedIds.length)).toBe(1)

		// draw a box
		await page.keyboard.press('r')
		await page.mouse.move(10, 250)
		await page.mouse.down()
		expect(await page.evaluate(() => app.selectedShapes.length)).toBe(1)

		// move to start drawing box (actually resizing)
		await page.mouse.move(100, 350)
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(2)
		expect(await page.evaluate(() => app.root.path.value)).toBe('root.select.resizing')

		// finish on mouse up
		await page.mouse.up()
		expect(await page.evaluate(() => app.root.path.value)).toBe('root.select.idle')
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(2)

		// The shape should be selected
		expect(await page.evaluate(() => app.selectedIds.length)).toBe(1)
	})

	test('undo and redo', async ({ page }) => {
		// buttons should be disabled when there is no history
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(0)
		expect(await page.evaluate(() => app.selectedShapes.length)).toBe(0)
		expect(page.getByTestId('main.undo')).toBeDisabled()
		expect(page.getByTestId('main.redo')).toBeDisabled()

		// create a shape
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		// We should have an undoable shape
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(1)
		expect(await page.evaluate(() => app.selectedShapes.length)).toBe(1)
		expect(page.getByTestId('main.undo')).not.toBeDisabled()
		expect(page.getByTestId('main.redo')).toBeDisabled()

		// Click the undo button to undo the shape
		await page.getByTestId('main.undo').click()
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(0)
		expect(await page.evaluate(() => app.selectedShapes.length)).toBe(0)
		expect(page.getByTestId('main.undo')).toBeDisabled()
		expect(page.getByTestId('main.redo')).not.toBeDisabled()

		// Click the redo button to redo the shape
		await page.getByTestId('main.redo').click()
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(1)
		expect(await page.evaluate(() => app.selectedShapes.length)).toBe(1)
		expect(page.getByTestId('main.undo')).not.toBeDisabled()
		expect(page.getByTestId('main.redo')).toBeDisabled()
	})

	test('style panel + undo and redo squashing', async ({ page }) => {
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()
		expect(await page.evaluate(() => app.selectedShapes.length)).toBe(1)

		const getSelectedShapeColor = async () =>
			await page.evaluate(() => (app.selectedShapes[0] as TLGeoShape).props.color)

		// change style
		expect(await getSelectedShapeColor()).toBe('black')

		// when on a mobile device...
		const hasMobileMenu = await page.isVisible('.tlui-toolbar__styles__button')

		if (hasMobileMenu) {
			// open the style menu
			await page.getByTestId('mobile.styles').click()
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

		await page.getByTestId('main.undo').click() // orange -> light blue
		expect(await getSelectedShapeColor()).toBe('light-blue') // skipping squashed colors!

		await page.getByTestId('main.redo').click() // light blue -> orange
		expect(await getSelectedShapeColor()).toBe('orange') // skipping squashed colors!

		await page.getByTestId('main.undo').click() // orange -> light blue
		await page.getByTestId('main.undo').click() // light blue -> black
		expect(await getSelectedShapeColor()).toBe('black')

		await page.getByTestId('main.redo').click() // black -> light blue
		await page.getByTestId('main.redo').click() // light-blue -> orange

		expect(page.getByTestId('main.redo')).toBeDisabled()
	})
})
