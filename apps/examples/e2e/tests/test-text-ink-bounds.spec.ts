import test, { expect, Page } from '@playwright/test'
import { Editor } from 'tldraw'
import { setup } from '../shared-e2e'

declare const editor: Editor

// These tests confirm — and lock down the fix for — glyph "ink" spilling outside a text
// shape's bounding box for cursive, RTL, and italic text:
//   - #8803 the on-canvas selection box is narrower than the rendered glyphs
//   - #8802 SVG/PNG exports clip the glyphs (the export viewport is the shape's geometry)
//
// They use an INDEPENDENT oracle: the production geometry comes from `editor.getShapeGeometry`,
// while the ground-truth ink is found by rasterising the text to a private canvas and scanning
// the painted pixels. The two are computed by different mechanisms (CSS layout + canvas pixels
// vs. the shape's own measurement), so the assertion can't pass by construction — it only
// passes when the shape's reported bounds genuinely contain the rendered glyphs.

interface InkResult {
	text: string
	direction: 'ltr' | 'rtl'
	advance: { w: number; h: number }
	geometry: { x: number; y: number; w: number; h: number }
	trueInk: { left: number; top: number; right: number; bottom: number }
	/** How far the painted glyph ink escapes the shape's geometry on each side (px). 0 == contained. */
	geometryOverflow: { left: number; right: number; top: number; bottom: number }
}

// Create a single-paragraph autosize text shape, wait for its web font, and measure the gap
// between the shape's geometry and the real painted ink. Runs entirely off the measurement
// element + a private canvas, so it doesn't depend on the shape being on-screen.
async function measureInk(
	page: Page,
	opts: { text: string; font: 'draw' | 'sans' | 'serif'; italic?: boolean }
): Promise<InkResult> {
	// Plain string (not a branded TLShapeId): the `shape:${string}` template type trips TS2589
	// in page.evaluate's Serializable check on the argument.
	const id = 'shape:inkProbe'
	return await page.evaluate(
		async ({ id, text, font, italic }) => {
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
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text, marks: italic ? [{ type: 'italic' }] : undefined }],
							},
						],
					},
					font,
					size: 'xl',
					autoSize: true,
					color: 'black',
				},
			})

			await ed.fonts.loadRequiredFontsForCurrentPage()
			await ed.getContainerDocument().fonts.ready

			const PAD = 80
			const shape = ed.getShape(id)
			const dv = ed
				.getShapeUtil(shape)
				.options.getDefaultDisplayValues(ed, shape, ed.getCurrentTheme(), 'light')
			const lineBoxH = Math.round(dv.fontSize * dv.lineHeight)

			// Lay the paragraph out exactly as the shape does (font, weight, italic mark, whole-pixel
			// line height) in a hidden, unconstrained element, and read its advance box back.
			const el = ed.getContainerDocument().createElement('div')
			el.setAttribute('dir', 'auto')
			el.style.cssText =
				'position:absolute;left:0;top:0;width:max-content;white-space:pre-wrap;visibility:hidden;margin:0;padding:0;'
			el.style.fontFamily = dv.fontFamily
			el.style.fontStyle = dv.fontStyle
			el.style.fontWeight = dv.fontWeight
			el.style.fontSize = `${dv.fontSize}px`
			el.style.lineHeight = `${lineBoxH}px`
			const p = ed.getContainerDocument().createElement('p')
			p.setAttribute('dir', 'auto')
			p.style.margin = '0'
			let leaf: Node = ed.getContainerDocument().createTextNode(text)
			if (italic) {
				const em = ed.getContainerDocument().createElement('em')
				em.appendChild(leaf)
				leaf = em
			}
			p.appendChild(leaf)
			el.appendChild(p)
			ed.getContainer().appendChild(el)
			const advRect = el.getBoundingClientRect()
			const view = ed.getContainerDocument().defaultView
			const cs = view.getComputedStyle(italic ? p.querySelector('em') : p)
			const fontShorthand = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
			const direction = view.getComputedStyle(p).direction
			el.remove()

			// Rasterise the same string with the same font onto a padded private canvas and scan the
			// alpha channel for the true painted bounding box (includes side bearings, slant, tall
			// diacritics — everything the advance width ignores).
			const cv = ed.getContainerDocument().createElement('canvas')
			cv.width = Math.ceil(advRect.width) + PAD * 2
			cv.height = Math.ceil(lineBoxH) + PAD * 2
			const ctx = cv.getContext('2d', { willReadFrequently: true })
			ctx.font = fontShorthand
			ctx.direction = direction
			ctx.textAlign = 'left'
			ctx.textBaseline = 'alphabetic'
			const fm = ctx.measureText(text)
			const halfLeading = (lineBoxH - (fm.fontBoundingBoxAscent + fm.fontBoundingBoxDescent)) / 2
			const baseline = PAD + halfLeading + fm.fontBoundingBoxAscent
			ctx.fillStyle = '#000'
			ctx.fillText(text, PAD, baseline)
			const data = ctx.getImageData(0, 0, cv.width, cv.height).data
			let minX = Infinity
			let minY = Infinity
			let maxX = -Infinity
			let maxY = -Infinity
			for (let y = 0; y < cv.height; y++) {
				for (let x = 0; x < cv.width; x++) {
					if (data[(y * cv.width + x) * 4 + 3] > 10) {
						if (x < minX) minX = x
						if (x > maxX) maxX = x
						if (y < minY) minY = y
						if (y > maxY) maxY = y
					}
				}
			}

			// Ink in advance-box-local coordinates (top-left of the advance box is the origin).
			const ink = {
				left: minX - PAD,
				right: maxX + 1 - PAD,
				top: minY - PAD,
				bottom: maxY + 1 - PAD,
			}
			const geo = ed.getShapeGeometry(id).bounds
			return {
				text,
				direction,
				advance: { w: advRect.width, h: advRect.height },
				geometry: { x: geo.x, y: geo.y, w: geo.w, h: geo.h },
				trueInk: ink,
				geometryOverflow: {
					left: Math.max(0, geo.x - ink.left),
					right: Math.max(0, ink.right - (geo.x + geo.w)),
					top: Math.max(0, geo.y - ink.top),
					bottom: Math.max(0, ink.bottom - (geo.y + geo.h)),
				},
			}
		},
		{ id, text: opts.text, font: opts.font, italic: !!opts.italic }
	)
}

// Export the text twice — once in an autosizing shape (whose box hugs the text), and once in a
// deliberately oversized fixed-width box (which can't clip) — and compare the painted glyph
// bounds. The shapes hold identical glyphs, so any difference is the autosize export clipping
// cursive/RTL/italic ink at its tight <foreignObject> (#8802). This is fully self-relative: it
// makes no assumption about which (fallback) font renders the script, so it's stable across CI.
async function measureExportClipping(
	page: Page,
	opts: { text: string; font: 'draw' | 'sans' | 'serif'; italic?: boolean }
): Promise<{ autoInk: { w: number; h: number }; wideInk: { w: number; h: number } }> {
	return await page.evaluate(
		async ({ text, font, italic }) => {
			const ed = editor as any
			ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
			const richText = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text, marks: italic ? [{ type: 'italic' }] : undefined }],
					},
				],
			}
			ed.createShape({
				id: 'shape:exAuto',
				type: 'text',
				x: 0,
				y: 0,
				props: { richText, font, size: 'xl', autoSize: true, color: 'black' },
			})
			ed.createShape({
				id: 'shape:exWide',
				type: 'text',
				x: 0,
				y: 400,
				props: { richText, font, size: 'xl', autoSize: false, w: 800, color: 'black' },
			})
			await ed.fonts.loadRequiredFontsForCurrentPage()
			await ed.getContainerDocument().fonts.ready

			// Scan the painted glyph bounding box of a single shape's PNG export (outline off, so its
			// shadow halo doesn't pollute the scan).
			async function inkBox(id: string) {
				const { url } = await ed.toImageDataUrl([id], {
					format: 'png',
					background: false,
					padding: 20,
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
				let minY = Infinity
				let maxX = -Infinity
				let maxY = -Infinity
				for (let y = 0; y < cv.height; y++) {
					for (let x = 0; x < cv.width; x++) {
						if (data[(y * cv.width + x) * 4 + 3] > 10) {
							if (x < minX) minX = x
							if (x > maxX) maxX = x
							if (y < minY) minY = y
							if (y > maxY) maxY = y
						}
					}
				}
				return isFinite(minX) ? { w: maxX - minX + 1, h: maxY - minY + 1 } : { w: 0, h: 0 }
			}

			const util = ed.getShapeUtil('text')
			const prevOutline = util.options.showTextOutline
			util.options.showTextOutline = false
			try {
				const autoInk = await inkBox('shape:exAuto')
				const wideInk = await inkBox('shape:exWide')
				return { autoInk, wideInk }
			} finally {
				util.options.showTextOutline = prevOutline
			}
		},
		{ text: opts.text, font: opts.font, italic: !!opts.italic }
	)
}

// A glyph edge can sit ~1px outside the box from anti-aliasing alone; require the box to contain
// the ink to within that, which still fails loudly against the 3–6px overflow seen on `main`.
const TOLERANCE = 1.5

test.describe('text shape ink bounds', () => {
	test.beforeEach(setup)

	test('selection bounds enclose italic glyph ink (#8803)', async ({ page }) => {
		// Italic glyphs slant past their pen-advance box. We use an italic mark on a bundled
		// tldraw font (a real embedded face, so metrics are stable across platforms — unlike
		// fallback-rendered scripts) to exercise the same overflow path as RTL/cursive clipping.
		const r = await measureInk(page, { text: 'Affjjy WV', font: 'serif', italic: true })
		expect(r.geometryOverflow.left).toBeLessThanOrEqual(TOLERANCE)
		expect(r.geometryOverflow.right).toBeLessThanOrEqual(TOLERANCE)
		expect(r.geometryOverflow.top).toBeLessThanOrEqual(TOLERANCE)
		expect(r.geometryOverflow.bottom).toBeLessThanOrEqual(TOLERANCE)
	})

	test('selection bounds enclose RTL Arabic glyph ink (#8803)', async ({ page }) => {
		const r = await measureInk(page, { text: 'مرحباً بكم في تلدرو', font: 'draw' })
		expect(r.direction).toBe('rtl')
		expect(r.geometryOverflow.left).toBeLessThanOrEqual(TOLERANCE)
		expect(r.geometryOverflow.right).toBeLessThanOrEqual(TOLERANCE)
		expect(r.geometryOverflow.top).toBeLessThanOrEqual(TOLERANCE)
		expect(r.geometryOverflow.bottom).toBeLessThanOrEqual(TOLERANCE)
	})

	test('export does not clip RTL Arabic glyph ink (#8802)', async ({ page }) => {
		// The autosize export must paint the same glyph bounds as the unclippable wide box. On
		// `main` the tight foreignObject clips the RTL ink on every side, so the autosize ink comes
		// up short in both width and height. Measured at scale 2, so the tolerance is ~1.5 css px.
		const { autoInk, wideInk } = await measureExportClipping(page, {
			text: 'مرحباً بكم في تلدرو',
			font: 'draw',
		})
		expect(autoInk.w).toBeGreaterThanOrEqual(wideInk.w - 3)
		expect(autoInk.h).toBeGreaterThanOrEqual(wideInk.h - 3)
	})

	test('export does not clip italic serif glyph ink (#8802)', async ({ page }) => {
		// Italic glyphs slant past their advance box. Using an italic mark on a bundled tldraw serif
		// (a real embedded italic face, so the slant is genuine type design with stable cross-platform
		// metrics, not a synthesized oblique), the autosize export must paint the same glyph bounds as
		// the unclippable wide box. On `main` the tight foreignObject clips the slanted ink, so the
		// autosize ink comes up short. Measured at scale 2, so the tolerance is ~1.5 css px.
		const { autoInk, wideInk } = await measureExportClipping(page, {
			text: 'Affjjy WV',
			font: 'serif',
			italic: true,
		})
		expect(autoInk.w).toBeGreaterThanOrEqual(wideInk.w - 3)
		expect(autoInk.h).toBeGreaterThanOrEqual(wideInk.h - 3)
	})

	test('leaves LTR latin text unchanged', async ({ page }) => {
		// Plain Latin sits inside its advance box, so the fix must not pad it or shift its origin.
		const r = await measureInk(page, { text: 'Hello world', font: 'sans' })
		expect(r.geometry.x).toBeCloseTo(0, 0)
		expect(r.geometry.y).toBeCloseTo(0, 0)
		expect(r.geometry.w).toBeCloseTo(r.advance.w + 1, 0)
		expect(r.geometryOverflow.left).toBeLessThanOrEqual(TOLERANCE)
		expect(r.geometryOverflow.right).toBeLessThanOrEqual(TOLERANCE)
	})

	test('does not over-expand fixed-width text that soft-wraps', async ({ page }) => {
		// A fixed-width shape wraps long text. The reported geometry must stay at the fixed width,
		// never ballooning out to the unwrapped advance.
		const geometryWidth = await page.evaluate(async () => {
			const ed = editor as any
			ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
			ed.createShape({
				id: 'shape:fixedWrap',
				type: 'text',
				x: 100,
				y: 100,
				props: {
					richText: {
						type: 'doc',
						content: [
							{
								type: 'paragraph',
								content: [
									{
										type: 'text',
										text: 'The quick brown fox jumps over the lazy dog and keeps on running',
									},
								],
							},
						],
					},
					font: 'sans',
					size: 'm',
					autoSize: false,
					w: 200,
					color: 'black',
				},
			})
			await ed.fonts.loadRequiredFontsForCurrentPage()
			await ed.getContainerDocument().fonts.ready
			return ed.getShapeGeometry('shape:fixedWrap').bounds.width as number
		})
		expect(geometryWidth).toBeLessThan(215)
	})

	test('pads mid-word soft-wrap by the worst prefix/suffix overhang', async ({ page }) => {
		// A word wider than the box can wrap mid-word (overflow-wrap: break-word), putting an interior
		// glyph at a line edge. `office` ends in a near-upright `e`, but its interior italic `f` leans
		// well past its advance — so a mid-word break exposes ink the word's own edges never do. The
		// fix detects the break (advance > wrap width) and pads by the worst prefix/suffix overhang, so
		// the wrapped measurement must exceed the unwrapped one. Without the fix they'd be identical.
		const r = await page.evaluate(async () => {
			const ed = editor as any
			ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
			const word = 'office'
			ed.createShape({
				id: 'shape:midWord',
				type: 'text',
				x: 0,
				y: 0,
				props: {
					richText: {
						type: 'doc',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: word, marks: [{ type: 'italic' }] }],
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

			const shape = ed.getShape('shape:midWord')
			const dv = ed
				.getShapeUtil(shape)
				.options.getDefaultDisplayValues(ed, shape, ed.getCurrentTheme(), 'light')
			const opts = {
				fontStyle: 'italic',
				fontWeight: dv.fontWeight,
				fontFamily: dv.fontFamily,
				fontSize: dv.fontSize,
				lineHeight: dv.lineHeight,
				padding: '0px',
			}
			// Unwrapped: only the word's own first/last glyph can sit at an edge.
			const fits = ed.textMeasure.measureWordsInkOverflow([word], { ...opts, maxWidth: null })
			// Forced to wrap mid-word: a narrow box the word can't fit on one line.
			const breaks = ed.textMeasure.measureWordsInkOverflow([word], { ...opts, maxWidth: 20 })
			return { fits, breaks }
		})
		expect(r.breaks.right).toBeGreaterThan(r.fits.right)
		expect(r.breaks.left).toBeGreaterThanOrEqual(r.fits.left)
	})
})
