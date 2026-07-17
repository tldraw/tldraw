import test, { expect, Page } from '@playwright/test'
import { Editor, TLTextShape } from 'tldraw'
import { setup } from '../shared-e2e'

declare const editor: Editor

test.describe('paste text measurement', () => {
	test.beforeEach(setup)

	async function pasteTextAndGetShape(page: Page, text: string, html?: string) {
		return await page.evaluate(
			async ({ text, html }) => {
				await editor.putExternalContent({
					type: 'text',
					text,
					html,
					point: editor.getViewportPageBounds().center,
				})
				const shapes = editor
					.getCurrentPageShapes()
					.filter((s): s is TLTextShape => s.type === 'text')
				const shape = shapes[shapes.length - 1]

				return {
					x: shape.x,
					y: shape.y,
					w: shape.props.w,
				}
			},
			{ text, html }
		)
	}

	test('pasting the same text as plain text or html produces the same shape', async ({ page }) => {
		const plainText = await pasteTextAndGetShape(page, 'Hello world')

		const withInlineStyles = await pasteTextAndGetShape(
			page,
			'Hello world',
			`<p class="p1" style="margin: 0px; font: 400 12px Helvetica; color: rgb(0, 0, 0);">Hello world</p>`
		)

		const withProsemirrorMeta = await pasteTextAndGetShape(
			page,
			'Hello world',
			`<meta charset="utf-8"><p dir="auto" data-pm-slice="0 0 []">Hello world</p>`
		)

		expect(plainText.x).toBe(withInlineStyles.x)
		expect(plainText.y).toBe(withInlineStyles.y)
		expect(plainText.w).toBe(withInlineStyles.w)

		expect(plainText.x).toBe(withProsemirrorMeta.x)
		expect(plainText.y).toBe(withProsemirrorMeta.y)
		expect(plainText.w).toBe(withProsemirrorMeta.w)
	})
})
