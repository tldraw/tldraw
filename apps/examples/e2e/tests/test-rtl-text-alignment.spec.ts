import test, { expect, Page } from '@playwright/test'
import { Editor } from 'tldraw'
import { setup } from '../shared-e2e'

declare const editor: Editor

// Regression coverage for #7720: RTL text alignment was reversed in PNG/SVG exports — `start`
// rendered the text flush-left and `end` flush-right, the opposite of how the canvas (and the
// logical `text-align` the editor uses) lays RTL text out. The hardcoded physical
// `.tl-text-wrapper[data-align] { text-align: left|right }` rules that caused it were removed in
// #8410 (the theme-system refactor), which moved alignment to inline logical `text-align`; this
// test locks that in so the physical mapping can't sneak back.
//
// It exports a two-line shape (a long line over a short line) and checks which edge the short line
// flushes to by scanning painted pixels per line-band — fully self-relative, so it doesn't depend
// on the (fallback) font that renders Arabic.

interface LineBands {
	imageWidth: number
	long: { left: number; right: number }
	short: { left: number; right: number }
}

// Export a two-paragraph (long, short) autosize text shape and return the painted ink extents of
// the top (long) and bottom (short) lines.
async function measureLineBands(
	page: Page,
	opts: { long: string; short: string; textAlign: 'start' | 'end' }
): Promise<LineBands> {
	return await page.evaluate(
		async ({ long, short, textAlign }) => {
			const ed = editor as any
			ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
			ed.createShape({
				id: 'shape:align',
				type: 'text',
				x: 0,
				y: 0,
				props: {
					richText: {
						type: 'doc',
						content: [
							{ type: 'paragraph', content: [{ type: 'text', text: long }] },
							{ type: 'paragraph', content: [{ type: 'text', text: short }] },
						],
					},
					font: 'draw',
					size: 'xl',
					autoSize: true,
					textAlign,
					color: 'black',
				},
			})
			await ed.fonts.loadRequiredFontsForCurrentPage()
			await ed.getContainerDocument().fonts.ready

			const { url } = await ed.toImageDataUrl(['shape:align'], {
				format: 'png',
				background: false,
				padding: 0,
				scale: 2,
			})
			const img = new Image()
			await new Promise((res, rej) => {
				img.onload = res
				img.onerror = rej
				img.src = url
			})
			const w = img.naturalWidth
			const h = img.naturalHeight
			const cv = ed.getContainerDocument().createElement('canvas')
			cv.width = w
			cv.height = h
			const ctx = cv.getContext('2d', { willReadFrequently: true })
			ctx.drawImage(img, 0, 0)
			const data = ctx.getImageData(0, 0, w, h).data

			// Scan a horizontal band [y0, y1) for the left/right extent of painted ink. The two lines
			// stack, so the top ~45% is the long line and the bottom ~45% is the short line; the
			// middle is skipped to keep ascenders/descenders from bleeding across the boundary.
			function band(y0: number, y1: number) {
				let left = Infinity
				let right = -Infinity
				for (let y = y0; y < y1; y++) {
					for (let x = 0; x < w; x++) {
						if (data[(y * w + x) * 4 + 3] > 10) {
							if (x < left) left = x
							if (x > right) right = x
						}
					}
				}
				return { left, right }
			}

			return {
				imageWidth: w,
				long: band(0, Math.floor(h * 0.45)),
				short: band(Math.ceil(h * 0.55), h),
			}
		},
		{ long: opts.long, short: opts.short, textAlign: opts.textAlign }
	)
}

const ARABIC_LONG = 'مرحباً بكم في تطبيق تلدرو الرائع'
const ARABIC_SHORT = 'سطر قصير'
const LATIN_LONG = 'The quick brown fox jumps over'
const LATIN_SHORT = 'short'

// Edges align (same flush side) within a few px; the indent on the other side is large (the lines
// differ a lot in length), so a generous gap keeps the direction check unambiguous.
const FLUSH_TOL = 6
const MIN_INDENT = 30

test.describe('RTL text export alignment (#7720)', () => {
	test.beforeEach(setup)

	test('RTL start aligns lines flush-right', async ({ page }) => {
		const { long, short } = await measureLineBands(page, {
			long: ARABIC_LONG,
			short: ARABIC_SHORT,
			textAlign: 'start',
		})
		// start === right for RTL: the short line's right edge meets the long line's, and it's
		// indented from the left.
		expect(Math.abs(short.right - long.right)).toBeLessThanOrEqual(FLUSH_TOL)
		expect(short.left - long.left).toBeGreaterThan(MIN_INDENT)
	})

	test('RTL end aligns lines flush-left', async ({ page }) => {
		const { long, short } = await measureLineBands(page, {
			long: ARABIC_LONG,
			short: ARABIC_SHORT,
			textAlign: 'end',
		})
		// end === left for RTL.
		expect(Math.abs(short.left - long.left)).toBeLessThanOrEqual(FLUSH_TOL)
		expect(long.right - short.right).toBeGreaterThan(MIN_INDENT)
	})

	test('LTR start aligns lines flush-left', async ({ page }) => {
		const { long, short } = await measureLineBands(page, {
			long: LATIN_LONG,
			short: LATIN_SHORT,
			textAlign: 'start',
		})
		expect(Math.abs(short.left - long.left)).toBeLessThanOrEqual(FLUSH_TOL)
		expect(long.right - short.right).toBeGreaterThan(MIN_INDENT)
	})

	test('LTR end aligns lines flush-right', async ({ page }) => {
		const { long, short } = await measureLineBands(page, {
			long: LATIN_LONG,
			short: LATIN_SHORT,
			textAlign: 'end',
		})
		expect(Math.abs(short.right - long.right)).toBeLessThanOrEqual(FLUSH_TOL)
		expect(short.left - long.left).toBeGreaterThan(MIN_INDENT)
	})
})
