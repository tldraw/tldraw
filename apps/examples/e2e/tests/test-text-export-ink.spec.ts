import test, { expect } from '@playwright/test'
import { Editor } from 'tldraw'
import { setup } from '../shared-e2e'

declare const editor: Editor

// #8802: italic / cursive glyph ink (side bearings, slanted ascenders) spills past a text shape's
// advance box. On PNG export the shape is drawn into a <foreignObject> sized to that advance box,
// and the rasteriser clips the overflow at its edge — so the exported image loses the ink.
//
// This is self-relative so it's font-independent and stable across CI: the same glyphs are exported
// twice — once in an autosizing shape whose box hugs the text (so its foreignObject can clip), and
// once in a deliberately wide fixed-width box that has room to spare (so it can't clip). We scan the
// painted glyph width of each PNG. If the autosize export clips the ink, it comes out narrower than
// the wide one; when the export encloses the ink, the two match.

test.describe('text export ink', () => {
	test.beforeEach(setup)

	test('autosize export encloses italic glyph ink like a wide box does (#8802)', async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== 'chromium',
			'export rasterisation compared on desktop chromium'
		)

		const { autoInkWidth, wideInkWidth } = await page.evaluate(async () => {
			const ed = editor as any
			ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
			const richText = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'jiffy', marks: [{ type: 'italic' }] }],
					},
				],
			}
			// Same glyphs, two boxes: one that hugs the text (can clip) and one with room (can't).
			ed.createShape({
				id: 'shape:exAuto',
				type: 'text',
				x: 0,
				y: 0,
				props: { richText, font: 'serif', size: 'xl', autoSize: true, color: 'black' },
			})
			ed.createShape({
				id: 'shape:exWide',
				type: 'text',
				x: 0,
				y: 400,
				props: { richText, font: 'serif', size: 'xl', autoSize: false, w: 800, color: 'black' },
			})
			await ed.fonts.loadRequiredFontsForCurrentPage()
			await ed.getContainerDocument().fonts.ready

			// Scan a single shape's PNG export for its painted glyph bounding-box width (outline off, so
			// the shadow halo doesn't pollute the scan).
			async function inkWidth(id: string) {
				const { url } = await ed.toImageDataUrl([id], {
					format: 'png',
					background: false,
					scale: 2,
				})
				const img = new Image()
				await new Promise((res, rej) => {
					img.onload = res
					img.onerror = rej
					img.src = url
				})
				const cv = ed.getContainerDocument().createElement('canvas')
				cv.width = img.naturalWidth
				cv.height = img.naturalHeight
				const ictx = cv.getContext('2d', { willReadFrequently: true })
				ictx.drawImage(img, 0, 0)
				const data = ictx.getImageData(0, 0, cv.width, cv.height).data
				let minX = Infinity
				let maxX = -Infinity
				for (let y = 0; y < cv.height; y++) {
					for (let x = 0; x < cv.width; x++) {
						if (data[(y * cv.width + x) * 4 + 3] > 10) {
							if (x < minX) minX = x
							if (x > maxX) maxX = x
						}
					}
				}
				return isFinite(minX) ? maxX - minX + 1 : 0
			}

			const util = ed.getShapeUtil('text')
			const prevOutline = util.options.showTextOutline
			util.options.showTextOutline = false
			try {
				const autoInkWidth = await inkWidth('shape:exAuto')
				const wideInkWidth = await inkWidth('shape:exWide')
				return { autoInkWidth, wideInkWidth }
			} finally {
				util.options.showTextOutline = prevOutline
			}
		})

		// The wide box can't clip, so its export shows the full glyph ink. The autosize export must
		// enclose the same ink (to within anti-aliasing) rather than cutting it at the advance box.
		expect(autoInkWidth).toBeGreaterThanOrEqual(wideInkWidth - 3)
	})

	test('png export of italic text is not clipped (visual) (#8802)', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'chromium', 'visual export snapshot on desktop chromium')

		const dataUrl: string = await page.evaluate(async () => {
			const ed = editor as any
			ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
			ed.createShape({
				id: 'shape:jiffy',
				type: 'text',
				x: 0,
				y: 0,
				props: {
					richText: {
						type: 'doc',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: 'jiffy', marks: [{ type: 'italic' }] }],
							},
						],
					},
					font: 'serif',
					size: 'xl',
					autoSize: true,
					color: 'black',
				},
			})
			await ed.fonts.loadRequiredFontsForCurrentPage()
			await ed.getContainerDocument().fonts.ready
			// Explicit padding (so no auto-trim) — the glyphs sit inside a clear margin, so the golden
			// unambiguously shows the italic ink fully enclosed rather than flush to a trimmed edge.
			const { url } = await ed.toImageDataUrl(['shape:jiffy'], {
				format: 'png',
				background: true,
				padding: 24,
				scale: 2,
			})
			return url as string
		})

		// Golden of the exported glyphs: the italic j / ff / y ink must be fully present, not cut off
		// at the advance box. Before the fix the descenders and slant were clipped at the edge.
		expect(Buffer.from(dataUrl.split(',')[1], 'base64')).toMatchSnapshot('jiffy-italic-export.png')
	})
})
