import test, { Browser, Page, expect } from '@playwright/test'
import { App } from '@tldraw/tldraw'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

declare const app: App
declare const __tldraw_event: { name: string }
let page: Page

async function setup({ browser }: { browser: Browser }) {
	page = await browser.newPage()
	await page.goto('http://localhost:5420/')
	await page.waitForSelector('.tl-canvas')
	await page.evaluate(() => (app.enableAnimations = false))
}

async function selectAllAndDelete() {
	await page.keyboard.press('Control+a')
	await page.keyboard.press('Backspace')
}

async function createBasicShapes() {
	await page.keyboard.press('r')
	await page.mouse.click(55, 55)
	await page.keyboard.press('r')
	await page.mouse.click(65, 205)
	await page.keyboard.press('r')
	await page.mouse.click(75, 355)
	await page.evaluate(async () => app.selectNone())
}

test.describe('keyboard shortcuts', () => {
	test.beforeAll(setup)
	test.afterEach(selectAllAndDelete)

	test('tools', async () => {
		const geoToolKds = [
			['r', 'rectangle'],
			['o', 'ellipse'],
		]

		for (const [key, geo] of geoToolKds) {
			await page.keyboard.press('v') // set back to select
			await page.keyboard.press(key)
			expect(await page.evaluate(() => app.currentToolId), `${key} -> ${geo}`).toBe('geo')
			expect(await page.evaluate(() => app.props!.geo), `${key} -> ${geo}`).toBe(geo)
		}

		const simpleToolKbds = [
			['v', 'select'],
			['h', 'hand'],
		]

		for (const [key, tool] of simpleToolKbds) {
			await page.keyboard.press('v') // set back to select
			await page.keyboard.press(key)
			expect(await page.evaluate(() => app.currentToolId), `${key} -> ${tool}`).toBe(tool)
		}

		const shapeToolKbds = [
			['d', 'draw'],
			['x', 'draw'],
			['a', 'arrow'],
			['l', 'line'],
			['f', 'frame'],
			['n', 'note'],
			['f', 'frame'],
			['e', 'eraser'],
			['k', 'laser'],
			['t', 'text'],
		]

		for (const [key, tool] of shapeToolKbds) {
			await page.keyboard.press('v') // set back to select
			await page.keyboard.press(key)
			expect(await page.evaluate(() => app.currentToolId), `${key} -> ${tool}`).toBe(tool)
		}
	})

	test('camera', async () => {
		// when on a mobile device...
		const hasMobileMenu = await page.isVisible('.tlui-toolbar__styles__button')

		// todo, add skip animations option to app
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(2)
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(4)
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(8)
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(8)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(4)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(2)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.5)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.25)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.1)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.1)
		await page.keyboard.press('Shift+0')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)

		// Zoom to fit (noop since the camera is empty)
		await page.keyboard.press('Shift+1')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)

		// Create a shape
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		await page.keyboard.press('Shift+1')

		expect(await page.evaluate(() => app.zoomLevel)).toBeGreaterThan(1)

		// zoom out to .5
		await page.keyboard.press('Shift+0')
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.5)

		await page.getByTestId('main.menu').click()
		await page.getByTestId('menu-item.edit').click()
		await page.getByTestId('menu-item.select-none').click()

		expect(await page.evaluate(() => app.selectedIds.length)).toBe(0)

		// zoom to selection (noop, the camera is empty)
		await page.keyboard.press('Shift+2')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.5)

		// select all
		await page.keyboard.press('Control+a')

		await page.keyboard.press('Shift+2')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)

		// zoom in
		await page.keyboard.press('Control+=')
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(4)

		// Now zoom to selection again (zooms to fill the screen)
		await page.keyboard.press('Shift+2')

		if (hasMobileMenu) {
			// should zoom out to fit the shape
			expect(await page.evaluate(() => app.zoomLevel)).toBeLessThan(2)
		} else {
			// should zoom in to fit the shape
			expect(await page.evaluate(() => app.zoomLevel)).toBeGreaterThan(2)
		}
	})

	test('grid mode', async () => {
		expect(await page.evaluate(() => app.isGridMode)).toBe(false)
		await page.keyboard.press("Control+'")
		expect(await page.evaluate(() => app.isGridMode)).toBe(true)
		await page.keyboard.press("Control+'")
		expect(await page.evaluate(() => app.isGridMode)).toBe(false)
	})

	test('dark mode', async () => {
		expect(await page.evaluate(() => app.isDarkMode)).toBe(false)
		await page.keyboard.press('Control+/')
		expect(await page.evaluate(() => app.isDarkMode)).toBe(true)
		await page.keyboard.press('Control+/')
		expect(await page.evaluate(() => app.isDarkMode)).toBe(false)
	})

	test.fixme('focus mode', async () => {
		expect(await page.evaluate(() => app.isFocusMode)).toBe(false)
		await page.keyboard.press('Control+.')
		expect(await page.evaluate(() => app.isFocusMode)).toBe(true)
		await page.keyboard.press('Control+.')
		expect(await page.evaluate(() => app.isFocusMode)).toBe(false)
	})

	test('tool lock', async () => {
		expect(await page.evaluate(() => app.isToolLocked)).toBe(false)
		await page.keyboard.press('q')
		expect(await page.evaluate(() => app.isToolLocked)).toBe(true)

		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		expect(await page.evaluate(() => app.currentToolId)).toBe('geo')

		await page.keyboard.press('q')
		expect(await page.evaluate(() => app.isToolLocked)).toBe(false)

		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		expect(await page.evaluate(() => app.currentToolId)).toBe('select')
	})

	// File
	test.skip('new-project — ⌘N', async () => {
		// todo
	})

	test.skip('open — ⌘O', async () => {
		// todo
	})

	test.skip('save — ⌘S', async () => {
		// todo
	})

	test.skip('save-as — ⌘⇧S', async () => {
		// todo
	})

	test.skip('upload-media — ⌘I', async () => {
		// todo
	})

	// Edit
	test.skip('undo — ⌘Z', async () => {
		// todo
	})

	test.skip('redo — ⌘⇧Z', async () => {
		// todo
	})

	test.skip('cut — ⌘X', async () => {
		// todo
	})

	test.skip('copy — ⌘C', async () => {
		// todo
	})

	test.skip('paste — ⌘V', async () => {
		// todo
	})

	test('select-all — ⌘A', async () => {
		await page.keyboard.press('r')
		await page.mouse.click(55, 55)

		await page.keyboard.press('r')
		await page.mouse.click(55, 255)

		await page.mouse.click(0, 0)

		expect(await page.evaluate(() => app.selectedIds.length)).toBe(0)

		await page.keyboard.press('Control+a')

		expect(await page.evaluate(() => app.selectedIds.length)).toBe(2)
	})

	test('delete — ⌫', async () => {
		await page.keyboard.press('r')
		await page.mouse.click(55, 55)
		await page.keyboard.press('r')
		await page.mouse.click(55, 255)

		expect(await page.evaluate(() => app.shapesArray.length)).toBe(2)
		expect(await page.evaluate(() => app.selectedIds.length)).toBe(1)

		await page.keyboard.press('Backspace')

		expect(await page.evaluate(() => app.shapesArray.length)).toBe(1)
		expect(await page.evaluate(() => app.selectedIds.length)).toBe(0)

		await page.keyboard.press('r')
		await page.mouse.click(100, 100)
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(2)

		await page.keyboard.press('Delete')
		expect(await page.evaluate(() => app.shapesArray.length)).toBe(1)
	})

	test('duplicate — ⌘D', async () => {
		await page.keyboard.press('r')
		await page.mouse.click(55, 55)
		await page.keyboard.press('r')
		await page.mouse.click(55, 255)

		expect(await page.evaluate(() => app.shapesArray.length)).toBe(2)
		expect(await page.evaluate(() => app.selectedIds.length)).toBe(1)

		await page.keyboard.press('Control+d')

		expect(await page.evaluate(() => app.shapesArray.length)).toBe(3)
		expect(await page.evaluate(() => app.selectedIds.length)).toBe(1)
	})
})

test.describe('Operations on Shapes', () => {
	test.beforeAll(setup)
	test.beforeEach(createBasicShapes)
	test.afterEach(selectAllAndDelete)

	test.describe('Alignment', () => {
		test('align left — ⌥A', async () => {
			page.keyboard.press('Control+a')
			await page.keyboard.press('Alt+a')

			expect(
				await page.evaluate(() => {
					return app.shapesArray.map((s) => s.x + 100)
				})
			).toMatchObject([55, 55, 55])
		})

		test('align right — ⌥D', async () => {
			page.keyboard.press('Control+a')
			await page.keyboard.press('Alt+d')

			expect(
				await page.evaluate(() => {
					return app.shapesArray.map((s) => s.x + 100)
				})
			).toMatchObject([75, 75, 75])
		})

		test('align top — ⌥W', async () => {
			page.keyboard.press('Control+a')
			await page.keyboard.press('Alt+w')

			expect(
				await page.evaluate(() => {
					return app.shapesArray.map((s) => s.y + 100)
				})
			).toMatchObject([55, 55, 55])
		})

		test('align bottom — ⌥W', async () => {
			page.keyboard.press('Control+a')
			await page.keyboard.press('Alt+w')

			expect(
				await page.evaluate(() => {
					return app.shapesArray.map((s) => s.y + 100)
				})
			).toMatchObject([55, 55, 55])
		})
	})

	test.describe('Reordering', () => {
		// Transform
		test('flip-h — ⇧H', async () => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Shift+h')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'flip-shapes',
				data: { operation: 'horizontal', source: 'kbd' },
			})
		})

		test('flip-v — ⇧V', async () => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Shift+v')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'flip-shapes',
				data: { operation: 'vertical', source: 'kbd' },
			})
		})

		test('move-to-front — ]', async () => {
			await page.mouse.click(50, 50) // bottom

			expect(await page.evaluate(() => app.onlySelectedShape)).toMatchObject({
				index: 'a1',
			})

			await page.keyboard.press(']')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'reorder-shapes',
				data: { operation: 'toFront', source: 'kbd' },
			})

			expect(await page.evaluate(() => app.onlySelectedShape)).toMatchObject({
				index: 'a4',
			})
		})

		test('move-forward — ⌥]', async () => {
			await page.mouse.click(50, 50) // bottom

			expect(await page.evaluate(() => app.onlySelectedShape)).toMatchObject({
				index: 'a1',
			})

			await page.keyboard.press('Alt+]')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'reorder-shapes',
				data: { operation: 'forward', source: 'kbd' },
			})

			expect(await page.evaluate(() => app.onlySelectedShape)).toMatchObject({
				index: 'a2V',
			})
		})

		test.fixme('move-to-back — [', async () => {
			await page.mouse.click(75, 355) // top

			expect(await page.evaluate(() => app.onlySelectedShape)).toMatchObject({
				index: 'a3',
			})

			await page.keyboard.press('[')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'reorder-shapes',
				data: { operation: 'toBack', source: 'kbd' },
			})

			expect(await page.evaluate(() => app.onlySelectedShape)).toMatchObject({
				index: 'a0',
			})
		})

		test('move-backward — ⌥[', async () => {
			await page.mouse.click(55, 355) // top

			expect(await page.evaluate(() => app.onlySelectedShape)).toMatchObject({
				index: 'a3',
			})

			await page.keyboard.press('Alt+[')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'reorder-shapes',
				data: { operation: 'backward', source: 'kbd' },
			})

			expect(await page.evaluate(() => app.onlySelectedShape)).toMatchObject({
				index: 'a1V',
			})
		})
	})

	test.describe('Group', () => {
		test('group — ⌘G', async () => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Control+g')
			expect(await page.evaluate(() => app.shapesArray.length)).toBe(4)
			expect(await page.evaluate(() => app.sortedShapesArray.map((s) => s.type))).toMatchObject([
				'group',
				'geo',
				'geo',
				'geo',
			])
		})

		test('ungroup — ⌘⇧G', async () => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Control+g')
			expect(await page.evaluate(() => app.shapesArray.length)).toBe(4)
			await page.keyboard.press('Control+Shift+g')
			expect(await page.evaluate(() => app.shapesArray.length)).toBe(3)
			expect(await page.evaluate(() => app.sortedShapesArray.map((s) => s.type))).toMatchObject([
				'geo',
				'geo',
				'geo',
			])
		})
	})

	test.describe('Preferences', () => {
		test('grid mode', async () => {
			expect(await page.evaluate(() => app.isGridMode)).toBe(false)
			await page.keyboard.press("Control+'")
			expect(await page.evaluate(() => app.isGridMode)).toBe(true)
			await page.keyboard.press("Control+'")
			expect(await page.evaluate(() => app.isGridMode)).toBe(false)
		})

		test('dark mode', async () => {
			expect(await page.evaluate(() => app.isDarkMode)).toBe(false)
			await page.keyboard.press('Control+/')
			expect(await page.evaluate(() => app.isDarkMode)).toBe(true)
			await page.keyboard.press('Control+/')
			expect(await page.evaluate(() => app.isDarkMode)).toBe(false)
		})

		test.fixme('focus mode', async () => {
			expect(await page.evaluate(() => app.isFocusMode)).toBe(false)
			await page.keyboard.press('Control+.')
			expect(await page.evaluate(() => app.isFocusMode)).toBe(true)
			await page.keyboard.press('Control+.')
			expect(await page.evaluate(() => app.isFocusMode)).toBe(false)
		})

		test('tool lock', async () => {
			expect(await page.evaluate(() => app.isToolLocked)).toBe(false)
			await page.keyboard.press('q')
			expect(await page.evaluate(() => app.isToolLocked)).toBe(true)

			await page.keyboard.press('r')
			await page.mouse.move(100, 100)
			await page.mouse.down()
			await page.mouse.up()

			expect(await page.evaluate(() => app.currentToolId)).toBe('geo')

			await page.keyboard.press('q')
			expect(await page.evaluate(() => app.isToolLocked)).toBe(false)

			await page.keyboard.press('r')
			await page.mouse.move(100, 100)
			await page.mouse.down()
			await page.mouse.up()

			expect(await page.evaluate(() => app.currentToolId)).toBe('select')
		})
	})
})
