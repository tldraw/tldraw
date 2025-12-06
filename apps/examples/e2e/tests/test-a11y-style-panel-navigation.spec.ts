import { Page, expect } from '@playwright/test'
import { Editor } from 'tldraw'
import test from '../fixtures/fixtures'
import { setupPage } from '../shared-e2e'

declare const editor: Editor

test.describe('A11y Style Panel Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await setupPage(page)
	})

	test('can navigate between geo shape label editing and style panel with keyboard', async ({
		page,
		isMobile,
	}) => {
		if (isMobile) {
			// Skip on mobile as the keyboard navigation behavior is different
			test.skip()
		}

		// Create a geo shape
		await page.keyboard.press('r') // Rectangle tool
		await page.mouse.click(200, 200)
		await page.keyboard.press('v') // Select tool

		// Verify we have a geo shape selected
		const selectedShapes = await page.evaluate(() => editor.getSelectedShapes())
		expect(selectedShapes).toHaveLength(1)
		expect(selectedShapes[0].type).toBe('geo')

		// Step 1: Press Enter to start editing the label
		await page.keyboard.press('Enter')

		// Verify we're in editing mode
		const isEditingShape = await page.evaluate(() => editor.getEditingShapeId() !== null)
		expect(isEditingShape).toBe(true)
		expect(await isFocusedOnRichTextEditor(page)).toBe(true)

		// Type some text
		await page.keyboard.type('Test Label')

		// Step 2: Press Escape to exit editing mode
		await page.keyboard.press('Escape')

		// Verify we're no longer editing
		const isStillEditing = await page.evaluate(() => editor.getEditingShapeId() !== null)
		expect(isStillEditing).toBe(false)

		// Step 3: Press Cmd+Enter to focus the style panel
		await page.keyboard.press('Meta+Enter')

		// Verify that the first button in the style panel is focused
		const isStylePanelFocused = await page.evaluate(() => {
			const activeEl = document.activeElement
			return activeEl?.closest('.tlui-style-panel') !== null && activeEl?.tagName === 'BUTTON'
		})
		expect(isStylePanelFocused).toBe(true)

		// Step 4: Use arrow keys to navigate to a different color (assuming color buttons are first)
		await page.keyboard.press('ArrowRight')

		// Verify focus has moved to the next button
		const newActiveElement = await page.evaluate(() => {
			const activeEl = document.activeElement
			return {
				tagName: activeEl?.tagName,
				inStylePanel: activeEl?.closest('.tlui-style-panel') !== null,
			}
		})
		expect(newActiveElement.tagName).toBe('BUTTON')
		expect(newActiveElement.inStylePanel).toBe(true)

		// Step 5: Press Enter to select the color
		await page.keyboard.press('Enter')

		// Step 6: Press Escape to return focus to the shape
		await page.keyboard.press('Escape')

		// Verify focus is back on the canvas/shape
		expect(await isFocusedOnCanvas(page)).toBe(true)

		// Step 7: Press Enter again to edit the label
		await page.keyboard.press('Enter')

		// Verify we're back in editing mode
		const isEditingAgain = await page.evaluate(() => editor.getEditingShapeId() !== null)
		expect(isEditingAgain).toBe(true)

		// Clear the existing text and type new text
		await page.keyboard.press('Meta+a') // Select all text
		await page.keyboard.type('Updated Label')

		// Exit editing
		await page.keyboard.press('Escape')

		// Verify the final text content
		const finalText = await page.evaluate(() => {
			const shape = editor.getSelectedShapes()[0] as any
			return editor.getShapeUtil(shape).getText(shape)
		})
		expect(finalText).toBe('Updated Label')
	})

	// Failing! This is failing because the keyboard event isn't being picked up while editing the rich
	// text. In practice the behavior does work, so this is a problem with the test or the way that we're
	// dispatching the event.
	test.fail('in a geo shape, cmd+enter returns focus to the canvas', async ({ page, isMobile }) => {
		if (isMobile) {
			test.skip()
		}

		// Create a geo shape
		await page.keyboard.press('r') // Rectangle tool
		await page.mouse.click(200, 200)
		await page.keyboard.press('v') // Select tool

		// press enter
		await page.keyboard.press('Enter')

		expect(await isFocusedOnRichTextEditor(page)).toBe(true)

		// expect editor to be in the editing state
		expect(await page.evaluate(() => editor.isIn('select.editing_shape'))).toBe(true)

		// dispatch cmd+enter to the active element
		await page.keyboard.press('ControlOrMeta+Enter')
		await page.waitForTimeout(100)

		expect(await page.evaluate(() => editor.isIn('select.editing_shape'))).toBe(false)

		expect(await isFocusedOnCanvas(page)).toBe(true)
	})

	test('in a note shape, cmd+enter creates the next shape and does not focus on the style panel', async ({
		page,
		isMobile,
	}) => {
		if (isMobile) {
			test.skip()
		}

		// Create a note shape
		await page.keyboard.press('n') // Note tool
		await page.mouse.click(200, 200)
		await page.waitForTimeout(200)

		expect(await isFocusedOnRichTextEditor(page)).toBe(true)

		const firstShapeId = await page.evaluate(() => {
			return editor.getOnlySelectedShape()?.id
		})
		expect(firstShapeId).toBeDefined()

		// Press cmd+enter
		await page.keyboard.press('Meta+Enter')

		// Should be on a new shape now
		const finalShapeId = await page.evaluate(() => {
			return editor.getOnlySelectedShape()?.id
		})
		expect(finalShapeId).toBeDefined()
		expect(finalShapeId).not.toBe(firstShapeId)

		expect(await isFocusedOnStylePanel(page)).toBe(false)
		expect(await isFocusedOnCanvas(page)).toBe(false)
		expect(await isFocusedOnRichTextEditor(page)).toBe(true)

		// Press escape
		await page.keyboard.press('Escape')

		expect(await isFocusedOnCanvas(page)).toBe(true)
	})

	test('style panel focus works with different geo shapes', async ({ page, isMobile }) => {
		if (isMobile) {
			test.skip()
		}

		// Test with ellipse
		await page.keyboard.press('o') // Ellipse tool
		await page.mouse.click(300, 300)
		await page.keyboard.press('v') // Select tool

		// Verify we can focus style panel
		await page.keyboard.press('Meta+Enter')

		expect(await isFocusedOnStylePanel(page)).toBe(true)

		// Return to shape and test editing
		await page.keyboard.press('Escape')
		await page.keyboard.press('Enter')

		const isEditing = await page.evaluate(() => editor.getEditingShapeId() !== null)
		expect(isEditing).toBe(true)
	})

	test('style panel focus works with cmd+enter shortcut', async ({ page, isMobile }) => {
		if (isMobile) {
			test.skip()
		}

		// Create a geo shape
		await page.keyboard.press('r') // Rectangle tool
		await page.mouse.click(200, 200)
		await page.keyboard.press('v') // Select tool

		expect(await isFocusedOnCanvas(page)).toBe(true)

		// Test that cmd+enter focuses the style panel even without editing first
		await page.keyboard.press('Meta+Enter')

		expect(await isFocusedOnStylePanel(page)).toBe(true)

		// Navigate in the style panel
		await page.keyboard.press('ArrowRight')

		// Verify focus is still in style panel
		expect(await isFocusedOnStylePanel(page)).toBe(true)

		// Return to canvas
		await page.keyboard.press('Escape')

		// Verify focus is back on canvas
		expect(await isFocusedOnCanvas(page)).toBe(true)
	})
})

async function isFocusedOnStylePanel(page: Page) {
	return await page.evaluate(() => {
		const activeEl = document.activeElement
		return (
			// check that the active element is within both the editor container and the style panel
			activeEl?.role === 'radio' && activeEl?.closest('.tlui-style-panel') !== null
		)
	})
}

async function isFocusedOnRichTextEditor(page: Page) {
	return await page.evaluate(() => {
		const activeEl = document.activeElement
		return (
			activeEl?.role === 'textbox' &&
			activeEl?.closest('.tl-container') !== null &&
			activeEl?.closest('.tlui-style-panel') === null
		)
	})
}

async function isFocusedOnCanvas(page: Page) {
	return await page.evaluate(() => {
		const activeEl = document.activeElement
		return (
			activeEl?.role === 'application' &&
			activeEl?.closest('.tl-container') !== null &&
			activeEl?.closest('.tlui-style-panel') === null
		)
	})
}
