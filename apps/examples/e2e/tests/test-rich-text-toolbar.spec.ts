import { expect } from '@playwright/test'
import { Editor, sleep } from 'tldraw'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

declare const editor: Editor

test.describe('Rich text behaviour', () => {
	test.beforeEach(setup)
	test.beforeEach(async ({ page, toolbar, isMobile }) => {
		// TODO: the mobile e2e test doesn't have the virtual keyboard at the moment.
		if (isMobile) return
		const { rectangle } = toolbar.tools
		await rectangle.click()
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

		// TODO: the mobile e2e test doesn't have the virtual keyboard at the moment.
		// if (isMobile) return

		const toolsForHTMLStyle = [
			{ name: 'bold', tag: 'strong' },
			// { name: 'italic', tag: 'emphasis' },
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
					const renderedText = document.querySelector('.tl-rich-text-tiptap')?.innerHTML
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
			return !!document.querySelector('.tl-rich-text-tiptap a[href="https://example.com"]')
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
			return !document.querySelector('.tl-rich-text-tiptap a[href="https://example.com"]')
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
		await expect(richTextToolbar.container).not.toHaveClass(/(^|\s)tlui-rich-text__toolbar__hidden/)

		await page.keyboard.type('alex chilton')

		expect(page.getByTestId('rich-text-area')).toHaveText('alex chilton')

		// bar should not be visible when nothing is selected

		await sleep(200)
		await expect(richTextToolbar.container).toHaveCount(1)
		await expect(richTextToolbar.container).toHaveClass(/(^|\s)tlui-rich-text__toolbar__hidden/)

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
		await expect(richTextToolbar.container).not.toHaveClass(/(^|\s)tlui-rich-text__toolbar__hidden/)

		await page.keyboard.type('big star')

		expect(page.getByTestId('rich-text-area')).toHaveText('big star')

		await sleep(200)
		await expect(richTextToolbar.container).toHaveCount(1)
		await expect(richTextToolbar.container).toHaveClass(/(^|\s)tlui-rich-text__toolbar__hidden/)
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
		await expect(richTextToolbar.container).not.toHaveClass(/(^|\s)tlui-rich-text__toolbar__hidden/)

		await page.keyboard.type('alex chilton')

		expect(page.getByTestId('rich-text-area')).toHaveText('alex chilton')
		await expect(richTextToolbar.container).toHaveClass(/(^|\s)tlui-rich-text__toolbar__hidden/)

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
		await expect(richTextToolbar.container).not.toHaveClass(/(^|\s)tlui-rich-text__toolbar__hidden/)

		await page.keyboard.type('big star')

		expect(page.getByTestId('rich-text-area')).toHaveText('big star')

		// bar should not be visible when nothing is selected

		await sleep(200)
		await expect(richTextToolbar.container).toHaveClass(/(^|\s)tlui-rich-text__toolbar__hidden/)
	})

	test.skip('positions correctly with sing-line selection', async () => {})

	test.skip('positions correctly with multi-line selection', async () => {})

	test.skip('positions correctly when rotated', async () => {})

	test.skip('positions correctly at the edges of the screen', async () => {})

	test.skip('hides when mousing down', async () => {})

	test.skip('updates position when changing selection with keyboard', async () => {})

	test.skip('positions correctly when shape size changes while selection is open', async () => {})
})
