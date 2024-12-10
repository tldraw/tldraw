import { expect } from '@playwright/test'
import { Editor } from 'tldraw'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

declare const editor: Editor

test.describe('Rich text behaviour', () => {
	test.beforeEach(setup)
	test.beforeEach(async ({ page, toolbar }) => {
		const { rectangle } = toolbar.tools
		await rectangle.click()
		await page.mouse.dblclick(150, 150)

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
		const locator = await page.getByLabel('Rich-Text Editor').getByText('Hello, world!')
		await locator.selectText()

		// Make the toolbar show up (isMousingAround needs to be true)
		await page.mouse.move(100, 100)
		await page.waitForTimeout(150)
	})

	test('selecting a style changes the style of the shapes', async ({ page, richTextToolbar }) => {
		const toolsForHTMLStyle = [
			{ name: 'bold', tag: 'strong' },
			{ name: 'strike', tag: 's' },
			{ name: 'highlight', tag: 'mark' },
			{ name: 'code', tag: 'code' },
			// Link is tested separately
			{ name: 'heading', tag: 'h3' },
			{ name: 'bulletList', tag: 'ul' },
		]

		for (const tool of toolsForHTMLStyle) {
			await richTextToolbar.clickTool(richTextToolbar.tools[tool.name])
			await page.waitForTimeout(33)
			await richTextToolbar.isSelected(richTextToolbar.tools[tool.name])

			// Find the contenteditable on the page and check the `tag`
			const isTagEnabled = await page.evaluate(
				async (toolTag) => {
					const richTextArea = await document.querySelector('[data-testid="rich-text-area"]')
						?.innerHTML
					const renderedText = await document.querySelector('.tl-rich-text-tiptap')?.innerHTML
					// Check tool.tag is in the innerHTML of the richTextArea and renderedText.
					return richTextArea?.includes(`<${toolTag}>`) && renderedText?.includes(`<${toolTag}>`)
				},
				[tool.tag]
			)
			expect(isTagEnabled).toBe(true)

			// Turn it off for the next thing to be tested.
			await richTextToolbar.clickTool(richTextToolbar.tools[tool.name])
		}
	})

	test('adding and removing a link', async ({ page, toolbar, richTextToolbar }) => {
		const { rectangle } = toolbar.tools
		await richTextToolbar.clickTool(richTextToolbar.tools.link)
		await page.keyboard.type('example.com')
		await page.keyboard.press('Enter')

		// Click away to get out of edit mode.
		await page.mouse.click(500, 500)
		await rectangle.click()
		await page.mouse.click(500, 500)
		await page.waitForTimeout(150)

		// Check the link has been rendered.
		// We could test this without clicking away but I want to
		// test that the link is still there after clicking away.
		const isLinkSet = await page.evaluate(async () => {
			return !!(await document.querySelector('.tl-rich-text-tiptap a[href="https://example.com"]'))
		})
		expect(isLinkSet).toBe(true)

		// Now, let's test removing the link.
		// Click on the shape to go into edit mode again.
		await page.mouse.dblclick(250, 200)
		await page.waitForTimeout(150)

		const locator = await page.getByLabel('Rich-Text Editor').getByText('Hello, world!')
		await locator.selectText()

		// Make the toolbar show up (isMousingAround needs to be true)
		await page.mouse.move(100, 100)
		await page.waitForTimeout(150)

		await richTextToolbar.clickTool(richTextToolbar.tools.link)
		await page.waitForTimeout(150)
		await richTextToolbar.clickTool(richTextToolbar.tools.linkRemove)

		const isLinkRemoved = await page.evaluate(async () => {
			return !(await document.querySelector('.tl-rich-text-tiptap a[href="https://example.com"]'))
		})
		expect(isLinkRemoved).toBe(true)
	})
})
