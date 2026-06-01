import test, { expect, Page } from '@playwright/test'
import { Editor } from 'tldraw'
import { setup } from '../shared-e2e'

declare const editor: Editor

test.describe('text shape ink bounds', () => {
	test.beforeEach(setup)

	// Creates an autosized text shape, waits for its webfont to load — so the canvas ink
	// measurement uses real glyph metrics and the geometry recomputes — then returns the
	// advance-box width alongside the (possibly ink-padded) geometry bounds.
	async function measure(page: Page, text: string, font: 'draw' | 'sans') {
		// Plain string (not a branded TLShapeId): the template-literal `shape:${string}` type
		// trips TS2589 in page.evaluate's Serializable check on the argument.
		const id = 'shape:textInkBounds'
		return await page.evaluate(
			async ({ id, text, font }) => {
				// Drop into `any` for the editor calls: fully typing a text-shape partial and
				// reaching TextShapeUtil.getMinDimensions inside page.evaluate trips TS2589 (the
				// shape-util union is too deep). The other e2e tests lean on `as any` similarly.
				const ed = editor as any
				ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
				ed.createShape({
					id,
					type: 'text',
					x: 200,
					y: 200,
					props: {
						richText: {
							type: 'doc',
							content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
						},
						font,
						size: 'xl',
						autoSize: true,
						color: 'black',
					},
				})

				await ed.fonts.loadRequiredFontsForCurrentPage()
				await ed.getContainerDocument().fonts.ready

				const shape = ed.getShape(id)
				const advanceWidth: number = ed.getShapeUtil(shape).getMinDimensions(shape).width
				const bounds = ed.getShapeGeometry(shape).bounds
				return {
					advanceWidth,
					geometryX: bounds.x as number,
					geometryWidth: bounds.width as number,
				}
			},
			{ id, text, font }
		)
	}

	test('grows the box to enclose RTL ink that spills past the advance width', async ({ page }) => {
		// Hebrew in the default (draw) font has cursive side bearings whose ink extends past
		// the pen-advance box. The shape's geometry must expand to contain them so the text
		// isn't drawn outside its own bounding box (#8803).
		const { advanceWidth, geometryWidth } = await measure(page, 'שלום עולם', 'draw')
		expect(geometryWidth).toBeGreaterThan(advanceWidth)
	})

	test('leaves the box unchanged for text that fits its advance width', async ({ page }) => {
		// Latin text in the sans font sits entirely inside its advance box, so there should
		// be no padding and no shift in the geometry origin.
		const { advanceWidth, geometryX, geometryWidth } = await measure(page, 'Hello world', 'sans')
		expect(geometryX).toBeCloseTo(0, 1)
		expect(geometryWidth).toBeCloseTo(advanceWidth, 1)
	})

	test('does not over-expand fixed-width text that soft-wraps', async ({ page }) => {
		// A fixed-width shape wraps long text across several lines. Ink overflow can only be
		// attributed for lines that fit the box, so wrapped lines are skipped — the geometry
		// must stay at the fixed width rather than ballooning to the unwrapped advance.
		const result = await page.evaluate(
			async ({ id, text, width }) => {
				const ed = editor as any
				ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
				ed.createShape({
					id,
					type: 'text',
					x: 100,
					y: 100,
					props: {
						richText: {
							type: 'doc',
							content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
						},
						font: 'sans',
						size: 'm',
						autoSize: false,
						w: width,
						color: 'black',
					},
				})
				await ed.fonts.loadRequiredFontsForCurrentPage()
				await ed.getContainerDocument().fonts.ready
				const shape = ed.getShape(id)
				const bounds = ed.getShapeGeometry(shape).bounds
				return { geometryWidth: bounds.width as number }
			},
			{
				id: 'shape:fixedWrap',
				text: 'The quick brown fox jumps over the lazy dog and keeps on running',
				width: 200,
			}
		)
		// Stays at the fixed width (a few px of slack), never the full unwrapped advance.
		expect(result.geometryWidth).toBeLessThan(210)
	})
})
