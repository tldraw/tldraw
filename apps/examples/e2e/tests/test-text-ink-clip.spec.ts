import test, { expect } from '@playwright/test'
import { Editor } from 'tldraw'
import { setup } from '../shared-e2e'

declare const editor: Editor

// Visual before/after of the glyph-ink-clipping fix, as a single large italic word so the overflow
// is unmistakable. Cursive/italic glyphs paint past their advance box; the fix grows the shape's
// geometry (and the export's <foreignObject>) to contain that ink.
//   - #8803 (on canvas): the text renders with overflow:visible, so before the fix the ink pokes out
//     past the too-tight selection box; after, the box encloses it.
//   - #8802 (export): the tight foreignObject clips the ink out of a PNG export; after, it doesn't.
// Before the fix these goldens show the ink spilling out / cut off; after, they show it contained.

// Italic 'jiffy' in a serif face: a real embedded italic (stable across platforms) whose ascenders,
// descenders, and slant overflow the advance box on every side.
const ITALIC_JIFFY = {
	type: 'doc',
	content: [
		{ type: 'paragraph', content: [{ type: 'text', text: 'jiffy', marks: [{ type: 'italic' }] }] },
	],
}

test.describe('text glyph ink clipping', () => {
	test.beforeEach(setup)

	test('italic glyph ink vs the selection box (#8803)', async ({ page }, testInfo) => {
		// Desktop chromium only: the mobile viewport is too small for the zoomed-in crop.
		test.skip(testInfo.project.name !== 'chromium', 'visual demo runs on desktop chromium')

		const clip = await page.evaluate(async (richText) => {
			const ed = editor as any
			ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
			ed.createShape({
				id: 'shape:demo',
				type: 'text',
				x: 0,
				y: 0,
				props: { richText, font: 'serif', size: 'xl', autoSize: true, color: 'black' },
			})
			await ed.fonts.loadRequiredFontsForCurrentPage()
			await ed.getContainerDocument().fonts.ready

			ed.setSelectedShapes(['shape:demo'])
			// Zoom right in on the shape so a few px of page-space overflow becomes a big on-screen gap.
			ed.zoomToSelection({ animation: { duration: 0 } })

			// Crop to the shape's selection box plus a margin for the overflowing ink + handles.
			const b = ed.getShapePageBounds('shape:demo')
			const tl = ed.pageToScreen({ x: b.minX, y: b.minY })
			const br = ed.pageToScreen({ x: b.maxX, y: b.maxY })
			const m = 100
			return {
				x: Math.round(tl.x - m),
				y: Math.round(tl.y - m),
				width: Math.round(br.x - tl.x + m * 2),
				height: Math.round(br.y - tl.y + m * 2),
			}
		}, ITALIC_JIFFY)

		// Hide the editor UI chrome (menus, toolbar) so the image is only the shape + its selection
		// box. The selection indicator lives in the canvas overlays, not `.tlui-layout`, so it stays.
		await page.addStyleTag({ content: '.tlui-layout { opacity: 0 !important; }' })

		await expect(page).toHaveScreenshot('italic-ink-vs-selection-box.png', {
			clip,
			animations: 'disabled',
		})
	})

	test('png export clips italic glyph ink (#8802)', async ({ page }, testInfo) => {
		// Desktop chromium only, to match the selection snapshot above.
		test.skip(testInfo.project.name !== 'chromium', 'visual demo runs on desktop chromium')

		const dataUrl = await page.evaluate(async (richText) => {
			const ed = editor as any
			ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
			ed.createShape({
				id: 'shape:demo',
				type: 'text',
				x: 0,
				y: 0,
				props: { richText, font: 'serif', size: 'xl', autoSize: true, color: 'black' },
			})
			await ed.fonts.loadRequiredFontsForCurrentPage()
			await ed.getContainerDocument().fonts.ready

			// Export just this shape to PNG with no padding, so the export bounds are exactly the
			// shape's geometry. Before the fix that geometry is the tight advance box, so the
			// foreignObject clips the slanted ascenders/descenders flush at the image edges; after the
			// fix the geometry grows to include the ink, so the export is taller/wider and the glyphs
			// are whole.
			const { url } = await ed.toImageDataUrl(['shape:demo'], {
				format: 'png',
				background: true,
				padding: 0,
				scale: 4,
			})
			return url as string
		}, ITALIC_JIFFY)

		const buffer = Buffer.from(dataUrl.split(',')[1], 'base64')
		expect(buffer).toMatchSnapshot('italic-png-export.png')
	})
})
