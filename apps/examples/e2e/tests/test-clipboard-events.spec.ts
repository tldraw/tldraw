import { expect } from '@playwright/test'
import { type Editor } from 'tldraw'
import test from '../fixtures/fixtures'
import { sleep } from '../shared-e2e'

declare const editor: Editor

test.describe('clipboard event callbacks', () => {
	test.beforeEach(async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		await page.goto('http://localhost:5420/clipboard-events/full')
		await page.waitForSelector('.tl-canvas')
		await page.evaluate(() => {
			editor.user.updateUserPreferences({ animationSpeed: 0 })
		})
	})

	test.beforeEach(async ({ page }) => {
		await page.evaluate(() => {
			editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
			;(window as any).__tldraw_clipboard_log = []
			;(window as any).__tldraw_clipboard_state.disableCopy = false
			;(window as any).__tldraw_clipboard_state.disablePaste = false
			;(window as any).__tldraw_clipboard_state.filterRedOnCopy = false
			;(window as any).__tldraw_clipboard_state.filterRedOnPaste = false
			;(window as any).__tldraw_clipboard_state.handleRawPaste = false
		})

		await page.evaluate(() => {
			editor.createShapes([{ type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
			editor.selectAll()
		})
		await page.locator('.tl-container').focus()
	})

	test('onBeforeCopyToClipboard runs on keyboard copy', async ({ page, isMac }) => {
		const modifier = isMac ? 'Meta' : 'Control'
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyC')
		await page.keyboard.up(modifier)
		await sleep(100)

		const log = await page.evaluate(() => (window as any).__tldraw_clipboard_log)
		expect(log).toHaveLength(1)
		expect(log[0]).toMatchObject({ action: 'copy', source: 'native', prevented: false })
	})

	test('onBeforeCopyToClipboard runs on keyboard cut', async ({ page, isMac }) => {
		const modifier = isMac ? 'Meta' : 'Control'
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyX')
		await page.keyboard.up(modifier)
		await sleep(100)

		const log = await page.evaluate(() => (window as any).__tldraw_clipboard_log)
		expect(log).toHaveLength(1)
		expect(log[0]).toMatchObject({ action: 'cut', source: 'native', prevented: false })
	})

	test('onBeforePasteFromClipboard runs on keyboard paste', async ({ page, isMac }) => {
		const modifier = isMac ? 'Meta' : 'Control'
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyC')
		await page.keyboard.up(modifier)
		await sleep(100)

		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyV')
		await page.keyboard.up(modifier)
		await sleep(100)

		const log = await page.evaluate(() => (window as any).__tldraw_clipboard_log)
		const pasteEntry = log.find((e: any) => e.action === 'paste')
		expect(pasteEntry).toMatchObject({ action: 'paste', source: 'native', prevented: false })
	})

	test('onBeforeCopyToClipboard can block copy', async ({ page, isMac }) => {
		await page.evaluate(() => {
			;(window as any).__tldraw_clipboard_state.disableCopy = true
		})

		const modifier = isMac ? 'Meta' : 'Control'
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyC')
		await page.keyboard.up(modifier)
		await sleep(100)

		const log = await page.evaluate(() => (window as any).__tldraw_clipboard_log)
		expect(log).toHaveLength(1)
		expect(log[0]).toMatchObject({ action: 'copy', source: 'native', prevented: true })
	})

	test('onBeforePasteFromClipboard can block paste', async ({ page, isMac }) => {
		const modifier = isMac ? 'Meta' : 'Control'

		// Copy normally first
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyC')
		await page.keyboard.up(modifier)
		await sleep(100)

		// Now block paste
		await page.evaluate(() => {
			;(window as any).__tldraw_clipboard_state.disablePaste = true
			;(window as any).__tldraw_clipboard_log = []
		})

		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyV')
		await page.keyboard.up(modifier)
		await sleep(200)

		const log = await page.evaluate(() => (window as any).__tldraw_clipboard_log)
		const pasteEntry = log.find((e: any) => e.action === 'paste')
		expect(pasteEntry).toMatchObject({ action: 'paste', source: 'native', prevented: true })

		const shapeCount = await page.evaluate(() => editor.getCurrentPageShapes().length)
		expect(shapeCount).toBe(1)
	})

	test('onBeforeCopyToClipboard can block cut', async ({ page, isMac }) => {
		await page.evaluate(() => {
			;(window as any).__tldraw_clipboard_state.disableCopy = true
		})

		const modifier = isMac ? 'Meta' : 'Control'
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyX')
		await page.keyboard.up(modifier)
		await sleep(100)

		const log = await page.evaluate(() => (window as any).__tldraw_clipboard_log)
		expect(log).toHaveLength(1)
		expect(log[0]).toMatchObject({ action: 'cut', source: 'native', prevented: true })

		const shapeCount = await page.evaluate(() => editor.getCurrentPageShapes().length)
		expect(shapeCount).toBe(1)
	})

	test('onBeforeCopyToClipboard can filter shapes from copy', async ({ page, isMac }) => {
		// Create a red shape and a blue shape
		await page.evaluate(() => {
			editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
			editor.createShapes([
				{ type: 'geo', x: 100, y: 100, props: { w: 100, h: 100, color: 'red' } },
				{ type: 'geo', x: 300, y: 100, props: { w: 100, h: 100, color: 'blue' } },
			])
			editor.selectAll()
			;(window as any).__tldraw_clipboard_log = []
			;(window as any).__tldraw_clipboard_state.filterRedOnCopy = true
		})

		const modifier = isMac ? 'Meta' : 'Control'

		// Copy (should filter out the red shape)
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyC')
		await page.keyboard.up(modifier)
		await sleep(200)

		// Delete all shapes, then paste
		await page.evaluate(() => {
			editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		})

		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyV')
		await page.keyboard.up(modifier)
		await sleep(200)

		// Only the blue shape should have been pasted
		const shapes = await page.evaluate(() =>
			editor.getCurrentPageShapes().map((s: any) => s.props.color)
		)
		expect(shapes).toEqual(['blue'])

		const log = await page.evaluate(() => (window as any).__tldraw_clipboard_log)
		const filterEntry = log.find((e: any) => e.action === 'filter-copy')
		expect(filterEntry).toMatchObject({
			action: 'filter-copy',
			detail: 'kept 1/2 shapes',
		})
	})

	test('onBeforePasteFromClipboard can filter shapes on paste', async ({ page, isMac }) => {
		// Create a red shape and a blue shape, then copy them normally
		await page.evaluate(() => {
			editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
			editor.createShapes([
				{ type: 'geo', x: 100, y: 100, props: { w: 100, h: 100, color: 'red' } },
				{ type: 'geo', x: 300, y: 100, props: { w: 100, h: 100, color: 'blue' } },
			])
			editor.selectAll()
			;(window as any).__tldraw_clipboard_log = []
		})

		const modifier = isMac ? 'Meta' : 'Control'

		// Copy both shapes normally
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyC')
		await page.keyboard.up(modifier)
		await sleep(200)

		// Enable paste filter and delete all shapes
		await page.evaluate(() => {
			;(window as any).__tldraw_clipboard_state.filterRedOnPaste = true
			;(window as any).__tldraw_clipboard_log = []
			editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		})

		// Paste (should filter out the red shape on the paste side)
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyV')
		await page.keyboard.up(modifier)
		await sleep(200)

		const shapes = await page.evaluate(() =>
			editor.getCurrentPageShapes().map((s: any) => s.props.color)
		)
		expect(shapes).toEqual(['blue'])

		const log = await page.evaluate(() => (window as any).__tldraw_clipboard_log)
		const filterEntry = log.find((e: any) => e.action === 'filter-paste')
		expect(filterEntry).toMatchObject({
			action: 'filter-paste',
			detail: 'kept 1/2 shapes',
		})
	})

	test('onClipboardPasteRaw runs before parsed paste and can take over (keyboard)', async ({
		page,
		isMac,
	}) => {
		await page.evaluate(() => {
			;(window as any).__tldraw_clipboard_state.handleRawPaste = true
			;(window as any).__tldraw_clipboard_log = []
		})

		const modifier = isMac ? 'Meta' : 'Control'
		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyC')
		await page.keyboard.up(modifier)
		await sleep(100)

		await page.keyboard.down(modifier)
		await page.keyboard.press('KeyV')
		await page.keyboard.up(modifier)
		await sleep(200)

		const log = await page.evaluate(() => (window as any).__tldraw_clipboard_log)
		const rawEntry = log.find((e: any) => e.action === 'raw-paste')
		expect(rawEntry).toMatchObject({ source: 'keyboard' })
		expect(rawEntry.detail).toContain('string')

		const parsedPaste = log.find((e: any) => e.action === 'paste' && e.source === 'native')
		expect(parsedPaste).toBeUndefined()

		const shapeCount = await page.evaluate(() => editor.getCurrentPageShapes().length)
		expect(shapeCount).toBe(1)
	})
})
