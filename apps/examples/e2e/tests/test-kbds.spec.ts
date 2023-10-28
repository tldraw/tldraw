import test, { Page, expect } from '@playwright/test'
import { setupPage, setupPageWithShapes } from '../shared-e2e'

declare const __tldraw_ui_event: { name: string }

// We're just testing the events, not the actual results.

let page: Page

test.describe('Keyboard Shortcuts', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
	})

	test('tools', async () => {
		const geoToolKds = [
			['r', 'rectangle'],
			['o', 'ellipse'],
		]

		for (const [key, geo] of geoToolKds) {
			await page.keyboard.press('v') // set back to select
			await page.keyboard.press(key)
			expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
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
			expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
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
			expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
				name: 'select-tool',
				data: { id: tool, source: 'kbd' },
			})
		}
	})
})

test.describe('Keyboard Shortcuts', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)

		// Make some shapes
		await page.keyboard.press('r')
		await page.mouse.click(100, 100)
		await page.keyboard.press('r')
		await page.mouse.click(250, 250)
		await page.keyboard.press('v')
	})

	test('Zoom in', async () => {
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'zoom-in',
			data: { source: 'kbd' },
		})
	})

	test('Zoom out', async () => {
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'zoom-out',
			data: { source: 'kbd' },
		})
	})

	test('Zoom to fit', async () => {
		await page.keyboard.press('Shift+1')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'zoom-to-fit',
			data: { source: 'kbd' },
		})
	})

	test('Zoom to selection', async () => {
		await page.keyboard.press('Shift+2')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'zoom-to-selection',
			data: { source: 'kbd' },
		})
	})

	test('Zoom to 100', async () => {
		await page.keyboard.press('Shift+0')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'reset-zoom',
			data: { source: 'kbd' },
		})
	})

	/* ---------------------- Files --------------------- */

	// new-project — Cmd+N
	// open — Cmd+O
	// save — Cmd+S
	// save-as — Cmd+Shift+S
	// upload-media — Cmd+I

	/* -------------------- Clipboard ------------------- */

	// await page.keyboard.press('Control+c')
	// expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
	// 	name: 'copy',
	// 	data: { source: 'kbd' },
	// })

	// await page.keyboard.press('Control+v')
	// expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
	// 	name: 'paste',
	// 	data: { source: 'kbd' },
	// })

	// await page.keyboard.press('Control+x')
	// expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
	// 	name: 'cut',
	// 	data: { source: 'kbd' },
	// })

	test('Toggle grid mode', async () => {
		await page.keyboard.press("Control+'")
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'toggle-grid-mode',
			data: { source: 'kbd' },
		})
	})

	test('Toggle dark mode', async () => {
		await page.keyboard.press('Control+/')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'toggle-dark-mode',
			data: { source: 'kbd' },
		})
	})

	test('Toggle tool lock', async () => {
		await page.keyboard.press('q')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'toggle-tool-lock',
			data: { source: 'kbd' },
		})
	})
})

test.describe('Actions on shapes', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
	})

	/* -------------- Operations on Shapes -------------- */

	test('Operations on shapes', async () => {
		await setupPageWithShapes(page)

		// select-all — Cmd+A
		await page.keyboard.press('Control+a')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'select-all-shapes',
			data: { source: 'kbd' },
		})

		// flip-h — Shift+H
		await page.keyboard.press('Shift+h')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'flip-shapes',
			data: { operation: 'horizontal', source: 'kbd' },
		})

		// flip-v — Shift+V
		await page.keyboard.press('Shift+v')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'flip-shapes',
			data: { operation: 'vertical', source: 'kbd' },
		})

		// move-to-front — ]
		await page.keyboard.press(']')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'reorder-shapes',
			data: { operation: 'toFront', source: 'kbd' },
		})

		// move-forward — Alt+]
		await page.keyboard.press('Alt+]')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'reorder-shapes',
			data: { operation: 'forward', source: 'kbd' },
		})

		// move-to-back — [
		await page.keyboard.press('[')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'reorder-shapes',
			data: { operation: 'toBack', source: 'kbd' },
		})

		// move-backward — Alt+[
		await page.keyboard.press('Alt+[')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'reorder-shapes',
			data: { operation: 'backward', source: 'kbd' },
		})

		// group — Cmd+G
		await page.keyboard.press('Control+g')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'group-shapes',
			data: { source: 'kbd' },
		})

		// ungroup — Cmd+Shift+G
		await page.keyboard.press('Control+Shift+g')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'ungroup-shapes',
			data: { source: 'kbd' },
		})

		// duplicate — Cmd+D
		await page.keyboard.press('Control+d')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'duplicate-shapes',
			data: { source: 'kbd' },
		})

		// align left — Alt+A
		await page.keyboard.press('Alt+a')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'align-shapes',
			data: { operation: 'left', source: 'kbd' },
		})

		// align right — Alt+D
		await page.keyboard.press('Alt+d')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'align-shapes',
			data: { operation: 'right', source: 'kbd' },
		})

		// align top — Alt+W
		await page.keyboard.press('Alt+w')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'align-shapes',
			data: { operation: 'top', source: 'kbd' },
		})

		// align bottom — Alt+W'
		await page.keyboard.press('Alt+s')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'align-shapes',
			data: { operation: 'bottom', source: 'kbd' },
		})

		// delete — backspace
		await page.keyboard.press('Control+a') // selected
		await page.keyboard.press('Backspace')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'delete-shapes',
			data: { source: 'kbd' },
		})

		// delete — ⌫

		// Make some shapes and select them
		await page.keyboard.press('r')
		await page.mouse.click(100, 100)
		await page.keyboard.press('r')
		await page.mouse.click(250, 250)
		await page.keyboard.press('v')
		await page.keyboard.press('Control+a')

		await page.keyboard.press('Delete')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'delete-shapes',
			data: { source: 'kbd' },
		})

		/* ---------------------- Misc ---------------------- */

		// toggle lock
		await page.keyboard.press('Shift+l')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'toggle-lock',
		})

		// await page.keyboard.press('Control+i')
		// expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
		// 	name: 'open-menu',
		// 	data: { source: 'dialog' },
		// })

		// await page.keyboard.press('Control+u')
		// expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
		// 	name: 'open-menu',
		// 	data: { source: 'dialog' },
		// })

		/* --------------------- Export --------------------- */

		await page.keyboard.press('Control+Shift+c')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'copy-as',
			data: { format: 'svg', source: 'kbd' },
		})
	})
})

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
