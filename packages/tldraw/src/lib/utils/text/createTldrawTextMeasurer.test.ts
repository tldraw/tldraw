import { toRichText } from '@tldraw/editor'
import { createFakeMeasureContext, installMeasureContext } from '@tldraw/rich-text-layout'
import { beforeAll, describe, expect, it } from 'vitest'
import { createTldrawTextMeasurer, TldrawTextMeasurer } from './createTldrawTextMeasurer'

// Deterministic advances: every grapheme is half the font size wide.
const fake = createFakeMeasureContext({ advance: 0.5, ascent: 0.8, descent: 0.2, boldFactor: 1.2 })
let measurer: TldrawTextMeasurer

const baseOpts = {
	fontFamily: "'tldraw_sans', sans-serif",
	fontSize: 20,
	fontWeight: 'normal',
	fontStyle: 'normal',
	lineHeight: 1.35,
	padding: '0px',
	maxWidth: null,
}

beforeAll(async () => {
	await installMeasureContext(fake)
	measurer = createTldrawTextMeasurer({ measureContext: fake })
})

describe('createTldrawTextMeasurer', () => {
	it('measures plain text like TextManager.measureText', () => {
		// line-height 1.35 × 20 rounds to 27px
		expect(measurer.measureText('hello', baseOpts)).toEqual({
			x: 0,
			y: 0,
			w: 50,
			h: 27,
			scrollWidth: 0,
		})
		// empty lines count, like normalizeTextForDom's ' ' substitution
		expect(measurer.measureText('a\n\nb', baseOpts).h).toBe(81)
	})

	it('wraps plain text at maxWidth and reports the box width', () => {
		const size = measurer.measureText('aaa bbb ccc', { ...baseOpts, maxWidth: 75 })
		expect(size).toMatchObject({ w: 75, h: 54 })
	})

	it('lays rich text out from the document rather than the html', () => {
		const richText = toRichText('hello\nworld')
		const size = measurer.measureHtml('<p>ignored</p>', { ...baseOpts, richText })
		expect(size).toMatchObject({ w: 50, h: 54 })
	})

	it('applies tldraw styles: empty paragraphs keep a line, headings scale', () => {
		const richText = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
				{ type: 'paragraph' },
				{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
			],
		}
		expect(measurer.measureHtml('', { ...baseOpts, richText }).h).toBe(81)

		const heading = {
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
			],
		}
		const layout = measurer.layoutRichText(heading, baseOpts)
		expect(layout.blocks[1].style.fontSize).toBe(40)
		expect(layout.blocks[1].style.fontWeight).toBe('bold')
		// 5px top + 40 × 1.35 line + 10px bottom
		expect(layout.height).toBe(5 + 54 + 10)
	})

	it('keeps code at the body size in tldraw mono', () => {
		const richText = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'x', marks: [{ type: 'code' }] }],
				},
			],
		}
		const layout = measurer.layoutRichText(richText, baseOpts)
		const fragment = layout.lines[0].fragments[0]
		expect(fragment.style.fontFamily).toBe("'tldraw_mono', monospace")
		expect(fragment.style.fontSize).toBe(20)
	})

	it('indents lists by tldraw’s ch padding and forces them left', () => {
		const richText = {
			type: 'doc',
			content: [
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
						},
					],
				},
			],
		}
		const layout = measurer.layoutRichText(richText, { ...baseOpts, textAlign: 'center' })
		// 1.625ch at a 10px zero advance
		expect(layout.lines[0].x).toBeCloseTo(16.25)
		expect(layout.width).toBeCloseTo(16.25 + 40)
		expect(layout.lines[0].fragments[0].kind).toBe('marker')
	})

	it('measures spans for frame headings with ellipsis truncation', () => {
		const spans = measurer.measureTextSpans('a long frame title', {
			overflow: 'truncate-ellipsis',
			width: 60,
			height: 24,
			padding: 0,
			fontSize: 10,
			fontWeight: 'normal',
			fontFamily: 'Arial',
			fontStyle: 'normal',
			lineHeight: 1,
			textAlign: 'start',
		})
		expect(spans[spans.length - 1].text).toBe('…')
		expect(spans.map((s) => s.text).join('')).toHaveLength(12)
		const full = measurer.measureTextSpans('short', {
			overflow: 'truncate-ellipsis',
			width: 60,
			height: 24,
			padding: 0,
			fontSize: 10,
			fontWeight: 'normal',
			fontFamily: 'Arial',
			fontStyle: 'normal',
			lineHeight: 1,
			textAlign: 'start',
		})
		expect(full).toEqual([{ text: 'short', box: { x: 0, y: 0, w: 25, h: 10 } }])
	})

	it('reports scrollWidth for overflowing content', () => {
		const size = measurer.measureText('abcdefghij', {
			...baseOpts,
			maxWidth: 40,
			disableOverflowWrapBreaking: true,
			measureScrollWidth: true,
		})
		expect(size.w).toBe(40)
		expect(size.scrollWidth).toBe(100)
	})

	it('writes the label colour and per-layout colours into fragments', () => {
		const richText = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'a' },
						{ type: 'text', text: 'b', marks: [{ type: 'highlight' }] },
					],
				},
			],
		}
		const layout = measurer.layoutRichText(richText, {
			...baseOpts,
			color: 'red',
			colors: { highlight: 'blue' },
		})
		const [a, b] = layout.lines[0].fragments
		expect(a.style.color).toBe('red')
		expect(b.style.background).toBe('blue')
	})
})
