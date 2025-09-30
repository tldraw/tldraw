import { expect } from '@playwright/test'
import { type Editor } from 'tldraw'
import test from '../fixtures/fixtures'
import { setup, sleep } from '../shared-e2e'

declare const editor: Editor

test.describe('Rich text behaviour', () => {
	test.beforeEach(setup)
	test.beforeEach(async ({ page, toolbar, isMobile }) => {
		// TODO: the mobile e2e test doesn't have the virtual keyboard at the moment.
		if (isMobile) return

		const { rectangle } = toolbar.tools
		await rectangle.click()
		await page.getByTestId('style.font.mono').first().click()

		await page.mouse.click(150, 150)
		await page.mouse.click(150, 150)

		const isEditing = await page.evaluate(
			() => editor.getEditingShapeId() === editor.getOnlySelectedShape()?.id
		)
		expect(isEditing).toBe(true)

		// Wait for the toolbar to animate in.
		await page.waitForTimeout(150)

		// Type into the rich text editor.
		const text = 'Hello, world!'
		await page.keyboard.type(text)

		// Select all the text.
		const locator = page.getByTestId('rich-text-area').getByText('Hello, world!')
		await locator.selectText()

		await page.waitForTimeout(150)
	})

	test('selecting a style changes the style of the text', async ({
		page,
		richTextToolbar,
		isMobile,
	}) => {
		// TODO: the mobile e2e test doesn't have the virtual keyboard at the moment.
		if (isMobile) return

		const toolsForHTMLStyle = [
			{ name: 'bold', tag: 'strong' },
			{ name: 'italic', tag: 'em' },
			// // { name: 'strike', tag: 's' },
			{ name: 'highlight', tag: 'mark' },
			{ name: 'code', tag: 'code' },
			// // Link is tested separately
			// { name: 'heading', tag: 'h3' },
			{ name: 'bulletList', tag: 'ul' },
		]

		for (const tool of toolsForHTMLStyle) {
			await richTextToolbar.clickTool(richTextToolbar.tools[tool.name])
			await page.waitForTimeout(33)
			await richTextToolbar.isSelected(richTextToolbar.tools[tool.name])

			// Find the contenteditable on the page and check the `tag`
			const isTagEnabled = await page.evaluate(
				async (toolTag) => {
					const richTextArea = document.querySelector('[data-testid="rich-text-area"]')?.innerHTML
					const renderedText = document.querySelector('.tl-rich-text')?.innerHTML
					// Check tool.tag is in the innerHTML of the richTextArea and renderedText.
					return richTextArea?.includes(`<${toolTag}`) && renderedText?.includes(`<${toolTag}`)
				},
				[tool.tag]
			)
			expect(isTagEnabled).toBe(true)

			// Turn it off for the next thing to be tested.
			await richTextToolbar.clickTool(richTextToolbar.tools[tool.name])
		}
	})

	test('adding and removing a link', async ({ page, toolbar, richTextToolbar, isMobile }) => {
		// TODO: the mobile e2e test doesn't have the virtual keyboard at the moment.
		if (isMobile) return

		const { rectangle } = toolbar.tools
		await richTextToolbar.clickTool(richTextToolbar.tools.link)
		await page.keyboard.type('example.com')
		await page.keyboard.press('Enter')

		// Click away to get out of edit mode.
		await page.mouse.click(150, 400)
		await rectangle.click()
		await page.mouse.click(150, 400)
		await page.waitForTimeout(150)

		// Check the link has been rendered.
		// We could test this without clicking away but I want to
		// test that the link is still there after clicking away.
		const isLinkSet = await page.evaluate(async () => {
			return !!document.querySelector('.tl-rich-text a[href="https://example.com"]')
		})
		expect(isLinkSet).toBe(true)

		// Now, let's test removing the link.
		// Click on the shape to go into edit mode again.
		await page.mouse.dblclick(250, 200)
		await page.waitForTimeout(150)

		const locator = page.getByTestId('rich-text-area').getByText('Hello, world!')
		await locator.selectText()

		// Make the toolbar show up (isMousingAround needs to be true)
		await page.mouse.move(100, 100)
		await page.waitForTimeout(150)

		await richTextToolbar.clickTool(richTextToolbar.tools.link)
		await page.waitForTimeout(150)
		await richTextToolbar.clickTool(richTextToolbar.tools.linkRemove)

		const isLinkRemoved = await page.evaluate(async () => {
			return !document.querySelector('.tl-rich-text a[href="https://example.com"]')
		})
		expect(isLinkRemoved).toBe(true)
	})

	// Text selection (the auto select all) doesn't seem to be working in our playwright tests
	test('shows the toolbar when double clicking a shape to select all', async ({
		page,
		richTextToolbar,
		isMobile,
	}) => {
		if (isMobile) return

		await page.keyboard.press('Escape')
		await page.keyboard.press('Escape')
		await page.mouse.click(550, 550)

		// bar should not be visible when nothing is selected

		await sleep(200)
		await expect(richTextToolbar.container).toHaveCount(0)

		await page.mouse.move(150, 150)
		await page.mouse.dblclick(150, 150)

		// bar should be visible (all of the text should be selected)
		await sleep(200)
		await expect(richTextToolbar.container).toHaveCount(1)
		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'true')

		await page.keyboard.type('alex chilton')

		expect(page.getByTestId('rich-text-area')).toHaveText('alex chilton')

		// bar should not be visible when nothing is selected

		await sleep(200)
		await expect(richTextToolbar.container).toHaveCount(1)
		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'false')

		await page.keyboard.press('Escape')
		await page.keyboard.press('Escape')

		// bar should not be visible when nothing is selected / not editing

		await sleep(400)
		await expect(richTextToolbar.container).toHaveCount(0)

		await page.mouse.move(150, 150)
		await page.mouse.click(150, 150)
		await page.mouse.click(150, 150)

		// bar should be visible (all of the text should be selected)
		await sleep(200)
		await expect(richTextToolbar.container).toHaveCount(1)
		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'true')

		await page.keyboard.type('big star')

		expect(page.getByTestId('rich-text-area')).toHaveText('big star')

		await sleep(200)
		await expect(richTextToolbar.container).toHaveCount(1)
		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'false')
	})

	// ...but it does seem to work with the enter key
	test('shows the toolbar when pressing enter on a shape to select all', async ({
		page,
		isMobile,
		richTextToolbar,
	}) => {
		if (isMobile) return

		await page.keyboard.press('Escape')
		await page.keyboard.press('Escape')

		// bar should not be visible when nothing is selected
		await sleep(200)
		await expect(richTextToolbar.container).toHaveCount(0)

		await page.mouse.click(150, 150) // select the shape
		await page.keyboard.press('Enter') // to start editing the shape

		// bar should be visible (all of the text should be selected)
		await sleep(200)
		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'true')

		await page.keyboard.type('alex chilton')

		expect(page.getByTestId('rich-text-area')).toHaveText('alex chilton')
		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'false')

		await sleep(200)
		await expect(richTextToolbar.container).toHaveCount(1)

		// deselect the shape
		await page.keyboard.press('Escape')
		await page.keyboard.press('Escape')
		await page.keyboard.press('Escape')
		await sleep(200)

		// select it and start editing it again
		await page.mouse.click(150, 150)
		await page.keyboard.press('Enter')

		// bar should be visible (all of the text should be selected)
		await sleep(200)
		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'true')

		await page.keyboard.type('big star')

		expect(page.getByTestId('rich-text-area')).toHaveText('big star')

		// bar should not be visible when nothing is selected

		await sleep(200)
		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'false')
	})

	test('positions correctly with selected text', async ({ isMobile, page, richTextToolbar }) => {
		if (isMobile) return // can't test this on mobile

		const PARA1 = 'whats that song?'
		const PARA2 = 'Im in love with that song'

		await page.keyboard.type(PARA1)
		await sleep(200)
		await page.keyboard.press('Enter')
		await page.keyboard.type(PARA2)
		await sleep(200)

		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'false')

		// selects an empty space between "in" and "love"
		await page.mouse.dblclick(150, 150)

		// takes a moment for the toolbar to show up
		await sleep(200)
		await expect(richTextToolbar.container).toHaveAttribute('data-visible', 'true')

		const originalSelectedTextBounds = await richTextToolbar.getSelectionBounds()

		{
			// Expect it to be above the currently selected text (the second paragraph)
			const toolbarRect = await page.getByTestId('rich-text.bold').boundingBox()
			expect(Math.round(toolbarRect!.y)).toBe(
				Math.round(originalSelectedTextBounds!.y - toolbarRect!.height - 8)
			)
		}

		// Select the next line too
		await page.keyboard.down('Shift')
		await page.keyboard.press('ArrowUp')
		await page.keyboard.press('ArrowUp')

		// There's a delay here before the toolbar position moves

		{
			// Even though we're now selecting both paragraphs, the toolbar should still
			// be above the second paragraph because the timer hasn't expired
			const toolbarRect = await page.getByTestId('rich-text.bold').boundingBox()
			expect(Math.round(toolbarRect!.y)).toBe(
				Math.round(originalSelectedTextBounds!.y - toolbarRect!.height - 8)
			)
		}

		// Let's test to see if the timer works by moving the second back to where it was.
		await sleep(100)

		// And go down instead
		await page.keyboard.press('ArrowDown')
		await page.keyboard.press('ArrowDown')
		await page.keyboard.press('ArrowDown')
		await page.keyboard.press('ArrowDown')

		// Wait for the delay to expire
		await sleep(500)

		{
			// Expect it to be above the currently selected text (the second paragraph)
			const toolbarRect = await page.getByTestId('rich-text.bold').boundingBox()
			const selectedTextRect = await richTextToolbar.getSelectionBounds()
			expect(Math.round(toolbarRect!.y)).toBe(
				Math.round(selectedTextRect!.y - toolbarRect!.height - 8)
			)
		}

		// Go all the way back up again and wait for the delay
		await page.keyboard.press('ArrowUp')
		await page.keyboard.press('ArrowUp')
		await page.keyboard.press('ArrowUp')

		// Let the delay expire again
		await sleep(500)

		{
			// now the toolbar should be above the first paragraph
			const toolbarRect = await page.getByTestId('rich-text.bold').boundingBox()
			const selectedTextRect = await richTextToolbar.getSelectionBounds()
			expect(Math.round(toolbarRect!.y)).toBe(
				Math.round(selectedTextRect!.y - toolbarRect!.height - 8)
			)
		}
	})

	test('positions correctly when rotated', async ({ isMobile, page, richTextToolbar }) => {
		if (isMobile) return // can't test this on mobile

		const PARA1 = 'Never traveled far'
		const PARA2 = 'Without a little star'

		await page.keyboard.type(PARA1)
		await page.keyboard.press('Enter')
		await page.keyboard.type(PARA2)

		// Deselct the shape
		await page.keyboard.press('Escape')

		// Rotate the shape
		await page.getByTestId('actions-menu.button').click()
		await page.getByTestId('actions-menu.rotate-cw').click()
		await page.mouse.click(300, 300)

		await page.keyboard.press('Escape')

		await sleep(150)

		// Select all text
		await page.mouse.dblclick(150, 150)
		await sleep(150)

		// Select two lines at the end of the text
		await page.keyboard.press('ArrowRight')
		await page.keyboard.down('Shift')
		await page.keyboard.press('ArrowUp')

		await sleep(500)

		// The toolbar should be just above the rotated selected text
		const toolbarRect = await page.getByTestId('rich-text.bold').boundingBox()
		const selectedTextRect = await richTextToolbar.getSelectionBounds()
		expect(Math.round(toolbarRect!.y)).toBe(
			Math.round(selectedTextRect!.y - toolbarRect!.height - 8)
		)

		// historically this has been flaky without the sleep
		await sleep(2000)
	})

	test('hides and shows based on selection changes', async ({
		isMobile,
		page,
		richTextToolbar,
	}) => {
		if (isMobile) return // can't test this on mobile

		// clear selection
		await page.keyboard.press('ArrowRight')

		await sleep(200)

		await expect(richTextToolbar.container).toHaveCSS('opacity', '0')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'none')

		await page.keyboard.down('Shift')
		await page.keyboard.press('ArrowLeft')
		await page.keyboard.up('Shift')

		await sleep(200)

		// now it should be visible and interactive
		await expect(richTextToolbar.container).toHaveCSS('opacity', '1')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'all')

		// clear selection again
		await page.keyboard.press('ArrowRight')

		// should still be visible for a moment
		await expect(richTextToolbar.container).toHaveCSS('opacity', '1')
		// But not interactive
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'none')

		// Without waiting, select the text again
		await page.keyboard.down('Shift')
		await page.keyboard.press('ArrowLeft')
		await page.keyboard.up('Shift')

		// Should be back to normal now
		await expect(richTextToolbar.container).toHaveCSS('opacity', '1')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'all')

		// no changes...
		await sleep(200)

		await expect(richTextToolbar.container).toHaveCSS('opacity', '1')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'all')

		// clear selection again
		await page.keyboard.press('ArrowRight')

		await sleep(200)

		// And gone gain after a delay
		await expect(richTextToolbar.container).toHaveCSS('opacity', '0')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'none')
	})

	test('hides and shows based on mouse down changes', async ({
		isMobile,
		page,
		richTextToolbar,
	}) => {
		if (isMobile) return // can't test this on mobile

		// Select the end of the text
		await page.keyboard.press('ArrowRight')
		await page.keyboard.down('Shift')
		await page.keyboard.press('ArrowLeft')
		await page.keyboard.up('Shift')

		await sleep(200)

		await expect(richTextToolbar.container).toHaveCSS('opacity', '1')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'all')

		// Now mouse down on the text

		await page.mouse.move(100, 150)
		await page.mouse.down()

		await expect(richTextToolbar.container).toHaveCSS('opacity', '1')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'none')

		await sleep(200)

		await expect(richTextToolbar.container).toHaveCSS('opacity', '0')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'none')

		await page.mouse.move(150, 150)
		await page.mouse.up()

		await expect(richTextToolbar.container).toHaveCSS('opacity', '0')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'none')

		await sleep(200)

		await expect(richTextToolbar.container).toHaveCSS('opacity', '1')
		await expect(richTextToolbar.container).toHaveCSS('pointer-events', 'all')

		// historically this has been flaky without the sleep
		await sleep(2000)
	})

	test.skip('positions correctly at the edges of the screen', async ({ isMobile }) => {
		if (isMobile) return // can't test this on mobile
	})

	test.skip('positions correctly when shape size changes while selection is open', async ({
		isMobile,
	}) => {
		if (isMobile) return // can't test this on mobile
	})
})
