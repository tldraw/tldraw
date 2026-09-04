import { beforeAll, describe, expect, it } from 'vitest'
import { createFakeMeasureContext } from '../measure/fake'
import { installMeasureContext } from '../measure/install'
import { layoutDocument } from './document'
import { LayoutQuery } from './query'

// 10px per grapheme at 20px, 30px lines, so every coordinate is a round number.
const fake = createFakeMeasureContext({ advance: 0.5, ascent: 0.8, descent: 0.2 })
const rootStyle = {
	fontFamily: 'Fake',
	fontSize: 20,
	lineHeight: '30px',
	whiteSpace: 'pre-wrap',
} as const

const doc = {
	type: 'doc',
	content: [
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'ab cd' },
				{ type: 'text', text: 'ef', marks: [{ type: 'bold' }] },
			],
		},
		{ type: 'paragraph' },
		{ type: 'paragraph', content: [{ type: 'text', text: 'gh' }] },
	],
}

let query: LayoutQuery

beforeAll(async () => {
	await installMeasureContext(fake)
	// lines: 'ab ' (0-30) / 'cdef' (0-40) / '' / 'gh'
	query = new LayoutQuery(layoutDocument(doc, { rootStyle, userAgentStyles: null, maxWidth: 45 }))
})

describe('LayoutQuery', () => {
	it('hit-tests to the nearest grapheme boundary', () => {
		expect(query.hitTest(14, 10)?.position).toEqual({ path: [0, 0], offset: 1 })
		expect(query.hitTest(16, 10)?.position).toEqual({ path: [0, 0], offset: 2 })
		// second line: 'cd' from the first text node, 'ef' from the second
		expect(query.hitTest(4, 40)?.position).toEqual({ path: [0, 0], offset: 3 })
		expect(query.hitTest(24, 40)?.position).toEqual({ path: [0, 1], offset: 0 })
		expect(query.hitTest(39, 40)).toMatchObject({
			position: { path: [0, 1], offset: 2 },
			trailing: true,
		})
	})

	it('snaps points outside the text to the nearest line and edge', () => {
		expect(query.hitTest(-50, 40)?.position).toEqual({ path: [0, 0], offset: 3 })
		expect(query.hitTest(500, 40)?.position).toEqual({ path: [0, 1], offset: 2 })
		expect(query.hitTest(0, -100)?.position).toEqual({ path: [0, 0], offset: 0 })
		expect(query.hitTest(15, 1000)?.position).toEqual({ path: [2, 0], offset: 2 })
		// the empty paragraph has no text to land on
		expect(query.hitTest(0, 75)).toBeNull()
	})

	it('places carets, keeping the end of a wrapped line on that line', () => {
		expect(query.caretRect({ path: [0, 0], offset: 1 })).toEqual({
			x: 10,
			y: 5,
			height: 20,
			lineIndex: 0,
		})
		// offset 3 is both the end of line 1 ('ab ') and the start of line 2 ('cd'): line 1 wins
		expect(query.caretRect({ path: [0, 0], offset: 3 })).toMatchObject({ x: 30, lineIndex: 0 })
		expect(query.caretRect({ path: [0, 1], offset: 1 })).toEqual({
			x: 30,
			y: 35,
			height: 20,
			lineIndex: 1,
		})
		expect(query.caretRect({ path: [2, 0], offset: 0 })).toMatchObject({ x: 0, lineIndex: 3 })
		expect(query.caretRect({ path: [9, 9], offset: 0 })).toBeNull()
	})

	it('returns one rect per line for a range, including empty lines inside it', () => {
		expect(query.rangeRects({ path: [0, 0], offset: 1 }, { path: [0, 1], offset: 1 })).toEqual([
			{ x: 10, y: 5, width: 20, height: 20 },
			{ x: 0, y: 35, width: 30, height: 20 },
		])
		// reversed anchor/head gives the same rects
		expect(query.rangeRects({ path: [0, 1], offset: 1 }, { path: [0, 0], offset: 1 })).toHaveLength(
			2
		)
		const across = query.rangeRects({ path: [0, 1], offset: 1 }, { path: [2, 0], offset: 1 })
		expect(across).toEqual([
			{ x: 30, y: 35, width: 10, height: 20 },
			{ x: 0, y: 60, width: 0, height: 30 },
			{ x: 0, y: 95, width: 10, height: 20 },
		])
	})

	it('gives a collapsed range at a wrap boundary a single rect, on the line the caret uses', () => {
		const wrap = { path: [0, 0], offset: 3 }
		expect(query.rangeRects(wrap, wrap)).toEqual([{ x: 30, y: 5, width: 0, height: 20 }])
		const mid = { path: [0, 1], offset: 1 }
		expect(query.rangeRects(mid, mid)).toEqual([{ x: 30, y: 35, width: 0, height: 20 }])
	})
})

function paragraph(text: string) {
	return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}

describe('LayoutQuery with right-to-left text', () => {
	it('maps offsets from the right edge of a right-to-left line', () => {
		// 'שלום' is 40px wide, start-aligned to the right edge of a 100px line: x 60-100
		const rtl = new LayoutQuery(
			layoutDocument(paragraph('שלום'), {
				rootStyle: { ...rootStyle, direction: 'auto', textAlign: 'start' },
				userAgentStyles: null,
				minWidth: 100,
			})
		)
		expect(rtl.layout.lines[0].fragments[0].level).toBe(1)
		expect(rtl.caretRect({ path: [0, 0], offset: 0 })).toMatchObject({ x: 100 })
		expect(rtl.caretRect({ path: [0, 0], offset: 1 })).toMatchObject({ x: 90 })
		expect(rtl.caretRect({ path: [0, 0], offset: 4 })).toMatchObject({ x: 60 })
		expect(rtl.hitTest(100, 10)).toMatchObject({
			position: { path: [0, 0], offset: 0 },
			trailing: false,
		})
		expect(rtl.hitTest(84, 10)?.position).toEqual({ path: [0, 0], offset: 2 })
		expect(rtl.hitTest(0, 10)).toMatchObject({
			position: { path: [0, 0], offset: 4 },
			trailing: true,
		})
		expect(rtl.rangeRects({ path: [0, 0], offset: 0 }, { path: [0, 0], offset: 2 })).toEqual([
			{ x: 80, y: 5, width: 20, height: 20 },
		])
		expect(rtl.rangeRects({ path: [0, 0], offset: 3 }, { path: [0, 0], offset: 4 })).toEqual([
			{ x: 60, y: 5, width: 10, height: 20 },
		])
	})

	it('keeps each fragment of a mixed-direction line in its own direction', () => {
		// visual order: 'ab' (0-20), ' ' (20-30), 'שלום' (30-70), ' ' (70-80), 'cd' (80-100)
		const mixed = new LayoutQuery(
			layoutDocument(paragraph('ab שלום cd'), {
				rootStyle: { ...rootStyle, direction: 'ltr' },
				userAgentStyles: null,
			})
		)
		expect(mixed.layout.lines[0].fragments.map((f) => [f.text, f.x, f.level])).toEqual([
			['ab', 0, 0],
			[' ', 20, 0],
			['שלום', 30, 1],
			[' ', 70, 0],
			['cd', 80, 0],
		])
		expect(mixed.caretRect({ path: [0, 0], offset: 1 })).toMatchObject({ x: 10 })
		// the Hebrew run reads from the right: offset 4 is one character in from x 70
		expect(mixed.caretRect({ path: [0, 0], offset: 4 })).toMatchObject({ x: 60 })
		expect(mixed.caretRect({ path: [0, 0], offset: 6 })).toMatchObject({ x: 40 })
		expect(mixed.caretRect({ path: [0, 0], offset: 9 })).toMatchObject({ x: 90 })
		expect(mixed.hitTest(10, 10)?.position).toEqual({ path: [0, 0], offset: 1 })
		expect(mixed.hitTest(40, 10)?.position).toEqual({ path: [0, 0], offset: 6 })
		expect(mixed.hitTest(60, 10)?.position).toEqual({ path: [0, 0], offset: 4 })
		expect(mixed.hitTest(90, 10)?.position).toEqual({ path: [0, 0], offset: 9 })
		// a sub-range of the Hebrew run: logical 5-7 is the left half of the fragment
		expect(mixed.rangeRects({ path: [0, 0], offset: 3 }, { path: [0, 0], offset: 5 })).toEqual([
			{ x: 50, y: 5, width: 20, height: 20 },
		])
		expect(mixed.rangeRects({ path: [0, 0], offset: 5 }, { path: [0, 0], offset: 7 })).toEqual([
			{ x: 30, y: 5, width: 20, height: 20 },
		])
		// a range spanning both directions covers the visual extent of everything selected
		expect(mixed.rangeRects({ path: [0, 0], offset: 1 }, { path: [0, 0], offset: 8 })).toEqual([
			{ x: 10, y: 5, width: 70, height: 20 },
		])
	})
})
