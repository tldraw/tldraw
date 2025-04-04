import { Page, expect } from '@playwright/test'
import { Editor } from 'tldraw'
import { setupPage, setupPageWithShapes } from '../shared-e2e'
import test from './fixtures/fixtures'

declare const editor: Editor

declare const __tldraw_ui_event: { name: string }

// We're just testing the events, not the actual results.

let page: Page

test.describe('Keyboard Shortcuts', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
	})

	test('tools', async ({ isMobile }) => {
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

		// make sure that the first dropdown item is rectangle
		await page.keyboard.press('r')

		const positionalToolKbds = [
			['1', 'select'],
			['2', 'hand'],
			['3', 'draw'],
			['4', 'eraser'],
			['5', 'arrow'],
			['6', 'text'],
		]

		if (isMobile) {
			// on mobile, the last item (first from the dropdown) is 6
			positionalToolKbds.push(['7', 'geo-rectangle'])
		} else {
			// on desktop, the last item (first from the dropdown) is 9
			positionalToolKbds.push(['9', 'geo-rectangle'])
		}
		for (const [key, tool] of positionalToolKbds) {
			await page.keyboard.press('v') // set back to select
			await page.keyboard.press(key)
			expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
				name: 'select-tool',
				data: { id: tool, source: 'toolbar' },
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
			name: 'color-scheme',
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

		// needs shapes on the canvas

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

		// Copy as SVG — this should have a clipboard error

		// await page.keyboard.press('Control+Shift+c')
		// expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
		// 	name: 'copy-as',
		// 	data: { format: 'svg', source: 'kbd' },
		// })

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

		// Next, previous pages — Alt+ArrowLeft, Alt+ArrowRight

		// Try a previous page move. We can't go lower since we're on the first page.
		// So the most recent event should be the previous delete

		await page.keyboard.press('Alt+ArrowLeft')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'delete-shapes',
			data: { source: 'kbd' },
		})

		// Next page. Since there's only one page and the page is empty, nothing should happen.

		await page.keyboard.press('Alt+ArrowRight')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'delete-shapes',
			data: { source: 'kbd' },
		})

		// make something on the new page and delete it
		await page.keyboard.press('r')
		await page.mouse.click(100, 100)

		// If there's something on the page, we can create the next page by moving up
		await page.keyboard.press('Alt+ArrowRight')

		// We'll also have a change page here... but the most recent will be the new page

		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'new-page',
			data: { source: 'kbd' },
		})

		// We can go back down...
		await page.keyboard.press('Alt+ArrowLeft')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'change-page',
			data: { source: 'kbd', direction: 'prev' },
		})

		// We can go up again
		await page.keyboard.press('Alt+ArrowRight')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'change-page',
			data: { source: 'kbd', direction: 'next' },
		})

		// We can back down and up with the up and down keys too...
		await page.keyboard.press('Alt+ArrowUp')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'change-page',
			data: { source: 'kbd', direction: 'prev' },
		})
		await page.keyboard.press('Alt+ArrowDown')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'change-page',
			data: { source: 'kbd', direction: 'next' },
		})

		/* ---------------------- Misc ---------------------- */

		// toggle lock
		await page.keyboard.press('Shift+l')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'toggle-lock',
		})

		await page.keyboard.press('Control+Shift+Alt+=')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'embiggen-shapes',
		})

		await page.keyboard.press('Control+Shift+Alt+-')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'emsmallen-shapes',
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

test.describe('Shape Navigation', () => {
	test.beforeEach(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
	})

	test('Tab navigation between shapes', async ({ isMobile }) => {
		if (isMobile) return // can't test this on mobile

		// Create multiple shapes
		await page.keyboard.press('r')
		await page.mouse.click(100, 100)
		await page.keyboard.press('r')
		await page.mouse.click(250, 100)
		await page.keyboard.press('r')
		await page.mouse.click(400, 100)
		await page.keyboard.press('v')

		// Click on the first shape to select it
		await page.mouse.click(100, 100)

		// Navigate forward with Tab
		await page.keyboard.press('Tab')
		expect(await page.evaluate(() => editor.getOnlySelectedShape())).toMatchObject({
			x: 150,
			y: 0,
		})

		// Navigate backward with Shift+Tab
		await page.keyboard.press('Shift+Tab')
		expect(await page.evaluate(() => editor.getOnlySelectedShape())).toMatchObject({
			x: 0,
			y: 0,
		})
	})

	test('Directional navigation between shapes', async ({ isMobile }) => {
		if (isMobile) return // can't test this on mobile

		// Create shapes in different directions
		await page.keyboard.press('r')
		await page.mouse.click(200, 200) // Center shape
		await page.keyboard.press('r')
		await page.mouse.click(300, 200) // Right shape
		await page.keyboard.press('r')
		await page.mouse.click(100, 200) // Left shape
		await page.keyboard.press('r')
		await page.mouse.click(200, 100) // Up shape
		await page.keyboard.press('r')
		await page.mouse.click(200, 300) // Down shape
		await page.keyboard.press('v')

		// Select center shape
		await page.mouse.click(200, 200)

		// Test navigation to the right
		await page.keyboard.press('Control+ArrowRight')
		expect(await page.evaluate(() => editor.getOnlySelectedShape())).toMatchObject({
			x: 200,
			y: 100,
		})

		// Navigate back to center
		await page.mouse.click(200, 200)

		// Disabled: I think this conflicts with browser nav or something.
		// // Test navigation to the left
		// await page.keyboard.press('Control+ArrowLeft')
		// expect(await page.evaluate(() => editor.getOnlySelectedShape())).toMatchObject({
		// 	x: 200,
		// 	y: 100
		// })

		// Navigate back to center
		await page.mouse.click(200, 200)

		// Test navigation up
		await page.keyboard.press('Control+ArrowUp')
		expect(await page.evaluate(() => editor.getOnlySelectedShape())).toMatchObject({
			x: 100,
			y: 100,
		})

		// Navigate back to center
		await page.mouse.click(200, 200)

		// Test navigation down
		await page.keyboard.press('Control+ArrowDown')
		expect(await page.evaluate(() => editor.getOnlySelectedShape())).toMatchObject({
			x: 100,
			y: 200,
		})
	})
})
