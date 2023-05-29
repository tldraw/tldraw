import test, { expect } from '@playwright/test'
import { App } from '@tldraw/tldraw'
import { setup, setupWithShapes } from '../shared-e2e'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

declare const app: App
declare const __tldraw_event: { name: string }

test.describe('keyboard shortcuts', () => {
	test.beforeEach(setup)

	test('tools', async ({ page }) => {
		const geoToolKds = [
			['r', 'rectangle'],
			['o', 'ellipse'],
		]

		for (const [key, geo] of geoToolKds) {
			await page.keyboard.press('v') // set back to select
			await page.keyboard.press(key)

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'select-tool',
				data: { id: `geo-${geo}`, source: 'kbd' },
			})
		}

		const simpleToolKbds = [
			['v', 'select'],
			['h', 'hand'],
		]

		for (const [key, tool] of simpleToolKbds) {
			await page.keyboard.press('v') // set back to select
			await page.keyboard.press(key)

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'select-tool',
				data: { id: tool, source: 'kbd' },
			})
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

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'select-tool',
				data: { id: tool, source: 'kbd' },
			})
		}
	})

	test('camera', async ({ page }) => {
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
})

test.describe('Camera', () => {
	test.beforeEach(setup)

	test('zoom in', async ({ page }) => {
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
			name: 'zoom-in',
			data: { source: 'kbd' },
		})
	})

	test('zoom out', async ({ page }) => {
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
			name: 'zoom-out',
			data: { source: 'kbd' },
		})
	})

	test('zoom to fit', async ({ page }) => {
		await page.keyboard.press('Shift+1')
		expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
			name: 'zoom-to-fit',
			data: { source: 'kbd' },
		})
	})

	test('zoom to selection', async ({ page }) => {
		await page.keyboard.press('r')
		await page.mouse.click(200, 200)
		await page.keyboard.press('Control+a')
		await page.keyboard.press('Shift+2')
		expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
			name: 'zoom-to-selection',
			data: { source: 'kbd' },
		})
	})

	test('reset zoom', async ({ page }) => {
		await page.keyboard.press('Shift+0')
		expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
			name: 'reset-zoom',
			data: { source: 'kbd' },
		})
	})
})

test.describe('Operations on Shapes', () => {
	test.beforeEach(setupWithShapes)

	test('select-all — Cmd+A', async ({ page }) => {
		await page.keyboard.press('Control+a')
		expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
			name: 'select-all-shapes',
			data: { source: 'kbd' },
		})
	})

	test('duplicate — Cmd+D', async ({ page }) => {
		await page.keyboard.press('Control+a')
		await page.keyboard.press('Control+d')

		expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
			name: 'duplicate-shapes',
			data: { source: 'kbd' },
		})
	})

	test('delete — backspace', async ({ page }) => {
		await page.keyboard.press('Control+a')
		await page.keyboard.press('Backspace')

		expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
			name: 'delete-shapes',
			data: { source: 'kbd' },
		})
	})

	test('delete — ⌫', async ({ page }) => {
		await page.keyboard.press('Control+a')
		await page.keyboard.press('Delete')

		expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
			name: 'delete-shapes',
			data: { source: 'kbd' },
		})
	})

	test.describe('Alignment', () => {
		test('align left — Alt+A', async ({ page }) => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Alt+a')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'align-shapes',
				data: { operation: 'left', source: 'kbd' },
			})
		})

		test('align right — Alt+D', async ({ page }) => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Alt+d')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'align-shapes',
				data: { operation: 'right', source: 'kbd' },
			})
		})

		test('align top — Alt+W', async ({ page }) => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Alt+w')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'align-shapes',
				data: { operation: 'top', source: 'kbd' },
			})
		})

		test('align bottom — Alt+W', async ({ page }) => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Alt+s')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'align-shapes',
				data: { operation: 'bottom', source: 'kbd' },
			})
		})
	})

	test.describe('Distribution', () => {
		test('distribute horizontal', async ({ page }) => {
			await page.keyboard.press('Control+a')
			await page.mouse.click(200, 200, { button: 'right' })
			await page.getByTestId('menu-item.arrange').click()
			await page.getByTestId('menu-item.distribute-horizontal').click()

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'distribute-shapes',
				data: { operation: 'horizontal', source: 'context-menu' },
			})
		})

		test('distribute vertical — Shift+Alt+V', async ({ page }) => {
			await page.keyboard.press('Control+a')
			await page.mouse.click(200, 200, { button: 'right' })
			await page.getByTestId('menu-item.arrange').click()
			await page.getByTestId('menu-item.distribute-vertical').click()

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'distribute-shapes',
				data: { operation: 'vertical', source: 'context-menu' },
			})
		})
	})

	test.describe('Reordering', () => {
		// Transform
		test('flip-h — Shift+H', async ({ page }) => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Shift+h')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'flip-shapes',
				data: { operation: 'horizontal', source: 'kbd' },
			})
		})

		test('flip-v — Shift+V', async ({ page }) => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Shift+v')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'flip-shapes',
				data: { operation: 'vertical', source: 'kbd' },
			})
		})

		test('move-to-front — ]', async ({ page }) => {
			await page.mouse.click(101, 101) // first
			await page.keyboard.press(']')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'reorder-shapes',
				data: { operation: 'toFront', source: 'kbd' },
			})
		})

		test('move-forward — Alt+]', async ({ page }) => {
			await page.mouse.click(101, 101) // first
			await page.keyboard.press('Alt+]')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'reorder-shapes',
				data: { operation: 'forward', source: 'kbd' },
			})
		})

		test('move-to-back — [', async ({ page }) => {
			await page.mouse.click(349, 349) // top
			await page.keyboard.press('[')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'reorder-shapes',
				data: { operation: 'toBack', source: 'kbd' },
			})
		})

		test('move-backward — Alt+[', async ({ page }) => {
			await page.mouse.click(349, 349) // top
			await page.keyboard.press('Alt+[')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'reorder-shapes',
				data: { operation: 'backward', source: 'kbd' },
			})
		})
	})

	test.describe('Group', () => {
		test('group — Cmd+G', async ({ page }) => {
			expect(await page.evaluate(() => app.shapesArray.length)).toBe(3)

			await page.keyboard.press('Control+a')
			await page.keyboard.press('Control+g')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'group-shapes',
				data: { source: 'kbd' },
			})
		})

		test('ungroup — Cmd+Shift+G', async ({ page }) => {
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Control+g')
			expect(await page.evaluate(() => app.shapesArray.length)).toBe(4)
			await page.keyboard.press('Control+Shift+g')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'ungroup-shapes',
				data: { source: 'kbd' },
			})
		})
	})

	test.describe('Preferences', () => {
		test('grid mode', async ({ page }) => {
			expect(await page.evaluate(() => app.isGridMode)).toBe(false)
			await page.keyboard.press("Control+'")

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'toggle-grid-mode',
				data: { source: 'kbd' },
			})
		})

		test('dark mode', async ({ page }) => {
			expect(await page.evaluate(() => app.isDarkMode)).toBe(false)
			await page.keyboard.press('Control+/')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'toggle-dark-mode',
				data: { source: 'kbd' },
			})
		})

		test.fixme('focus mode', async ({ page }) => {
			expect(await page.evaluate(() => app.isFocusMode)).toBe(false)
			await page.keyboard.press('Control+.')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'toggle-focus-mode',
				data: { source: 'kbd' },
			})
		})

		test('tool lock', async ({ page }) => {
			expect(await page.evaluate(() => app.isToolLocked)).toBe(false)
			await page.keyboard.press('q')

			expect(await page.evaluate(() => __tldraw_event)).toMatchObject({
				name: 'toggle-tool-lock',
				data: { source: 'kbd' },
			})

			// expect(await page.evaluate(() => app.isToolLocked)).toBe(true)

			// await page.keyboard.press('r')
			// await page.mouse.move(100, 100)
			// await page.mouse.down()
			// await page.mouse.up()

			// expect(await page.evaluate(() => app.currentToolId)).toBe('geo')

			// await page.keyboard.press('q')
			// expect(await page.evaluate(() => app.isToolLocked)).toBe(false)

			// await page.keyboard.press('r')
			// await page.mouse.move(100, 100)
			// await page.mouse.down()
			// await page.mouse.up()

			// expect(await page.evaluate(() => app.currentToolId)).toBe('select')
		})
	})

	// File
	test.skip('new-project — Cmd+N', async () => void null)
	test.skip('open — Cmd+O', async () => void null)
	test.skip('save — Cmd+S', async () => void null)
	test.skip('save-as — Cmd+Shift+S', async () => void null)
	test.skip('upload-media — Cmd+I', async () => void null)

	// History
	test.skip('undo — Cmd+Z', async () => void null)
	test.skip('redo — Cmd+Shift+Z', async () => void null)

	// Clipboard
	test.skip('cut — Cmd+X', async () => void null)
	test.skip('copy — Cmd+C', async () => void null)
	test.skip('paste — Cmd+V', async () => void null)
})
