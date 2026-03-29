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

				// Get the geometry bounds (computed using renderHtmlFromRichTextForMeasurement)
				const geoBounds = editor.getShapeGeometry(shape).bounds

				return {
					shape: { x: shape.x, y: shape.y, props: shape.props },
					geoBounds: { w: geoBounds.w, h: geoBounds.h },
				}
			},
			{ text, html }
		)
	}

	test('pasted plain text shape dimensions match its geometry', async ({ page }) => {
		const { shape, geoBounds } = await pasteTextAndGetShape(page, 'Hello world')

		// The shape's w prop should be close to the geometry width.
		// Before the fix, paste used different HTML for measurement than the
		// shape geometry, causing a mismatch.
		expect(Math.abs(shape.props.w - geoBounds.w)).toBeLessThanOrEqual(1)
	})

	test('pasted html text shape dimensions match its geometry', async ({ page }) => {
		const { shape, geoBounds } = await pasteTextAndGetShape(
			page,
			'Hello world',
			'<p>Hello <strong>world</strong></p>'
		)

		expect(Math.abs(shape.props.w - geoBounds.w)).toBeLessThanOrEqual(1)
	})

	test('pasted multiline text shape dimensions match its geometry', async ({ page }) => {
		const { shape, geoBounds } = await pasteTextAndGetShape(page, 'Line one\nLine two\nLine three')

		expect(Math.abs(shape.props.w - geoBounds.w)).toBeLessThanOrEqual(1)
	})

	test('pasted multiline html shape dimensions match its geometry', async ({ page }) => {
		const { shape, geoBounds } = await pasteTextAndGetShape(
			page,
			'Line one\nLine two',
			'<p>Line one</p><p>Line two</p>'
		)

		expect(Math.abs(shape.props.w - geoBounds.w)).toBeLessThanOrEqual(1)
	})
})
