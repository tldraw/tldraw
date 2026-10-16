import type { Editor, TLMeasureTextOpts, TLMeasureTextSpanOpts } from '@tldraw/editor'
import { describe, expect, it } from 'vitest'
import { CELL_H, CELL_W } from './constants'
import { htmlToText, installMonospaceTextMeasure, layoutText } from './textMeasure'

describe('layoutText', () => {
	it('keeps explicit newlines and never wraps when maxWidthCells is null', () => {
		expect(layoutText('hello world\nline two', { maxWidthCells: null })).toEqual({
			lines: ['hello world', 'line two'],
			widthCells: 11,
			heightCells: 2,
		})
		expect(layoutText('a\r\nb\rc', { maxWidthCells: null }).lines).toEqual(['a', 'b', 'c'])
	})

	it('measures the empty string as one empty line', () => {
		expect(layoutText('', { maxWidthCells: null })).toEqual({
			lines: [''],
			widthCells: 0,
			heightCells: 1,
		})
		expect(layoutText('a\n\nb', { maxWidthCells: 10 }).lines).toEqual(['a', '', 'b'])
	})

	it('wraps at spaces and drops the space at the wrap point', () => {
		expect(layoutText('hello big world', { maxWidthCells: 9 })).toEqual({
			lines: ['hello big', 'world'],
			widthCells: 9,
			heightCells: 2,
		})
		// Spaces inside a line survive; a run of spaces at the wrap point hangs.
		expect(layoutText('a  b   c', { maxWidthCells: 4 }).lines).toEqual(['a  b', 'c'])
	})

	it('hard-breaks a word longer than the whole line', () => {
		expect(layoutText('abcdefghij', { maxWidthCells: 4 }).lines).toEqual(['abcd', 'efgh', 'ij'])
		expect(layoutText('ab cdefghij k', { maxWidthCells: 4 }).lines).toEqual([
			'ab',
			'cdef',
			'ghij',
			'k',
		])
	})

	it('counts CJK and emoji graphemes as two cells', () => {
		expect(layoutText('日本語', { maxWidthCells: null }).widthCells).toBe(6)
		expect(layoutText('日本語 text', { maxWidthCells: 4 }).lines).toEqual(['日本', '語', 'text'])
		expect(layoutText('👍🏽 ok', { maxWidthCells: null }).widthCells).toBe(5)
		// Combining marks add no width: "é" written as e + U+0301 is one cell.
		expect(layoutText('é', { maxWidthCells: null }).widthCells).toBe(1)
		// Ambiguous-width characters are narrow unless the terminal was probed as wide.
		expect(layoutText('±', { maxWidthCells: null }).widthCells).toBe(1)
		expect(layoutText('±', { maxWidthCells: null, ambiguousWide: true }).widthCells).toBe(2)
	})

	it('truncate-ellipsis keeps maxLines lines (default 1) and ends with an ellipsis', () => {
		expect(
			layoutText('one two three four', { maxWidthCells: 9, overflow: 'truncate-ellipsis' })
		).toEqual({ lines: ['one two…'], widthCells: 8, heightCells: 1 })
		expect(
			layoutText('one two three four', {
				maxWidthCells: 9,
				overflow: 'truncate-ellipsis',
				maxLines: 2,
			}).lines
		).toEqual(['one two', 'three…'])
		// A full last line gives up its final cell to the ellipsis.
		expect(
			layoutText('abcdefghi jk', { maxWidthCells: 9, overflow: 'truncate-ellipsis' }).lines
		).toEqual(['abcdefgh…'])
		// Nothing dropped, nothing marked.
		expect(layoutText('short', { maxWidthCells: 9, overflow: 'truncate-ellipsis' }).lines).toEqual([
			'short',
		])
		// Without a width limit the ellipsis still marks dropped lines.
		expect(
			layoutText('a\nb\nc', { maxWidthCells: null, overflow: 'truncate-ellipsis', maxLines: 2 })
				.lines
		).toEqual(['a', 'b…'])
	})

	it('truncate-clip drops the overflow silently', () => {
		expect(layoutText('one two three', { maxWidthCells: 9, overflow: 'truncate-clip' })).toEqual({
			lines: ['one two'],
			widthCells: 7,
			heightCells: 1,
		})
	})
})

describe('htmlToText', () => {
	it('converts the measurement HTML of paragraphs, including empty ones', () => {
		expect(
			htmlToText(
				'<div class="tl-rich-text"><p dir="auto">hello</p><p dir="auto"><br /></p><p dir="auto">world</p></div>'
			)
		).toBe('hello\n\nworld')
		expect(htmlToText('<div class="tl-rich-text"><p dir="auto">solo</p></div>')).toBe('solo')
		expect(htmlToText('<div class="tl-rich-text"><p dir="auto"><br /></p></div>')).toBe('')
	})

	it('turns <br> into newlines and decodes entities', () => {
		expect(
			htmlToText(
				'<p>a&amp;b &lt;c&gt; &quot;d&quot; &#39;e&#39; f&nbsp;g&#x41;&#66;<br>next<br/>last</p>'
			)
		).toBe('a&b <c> "d" \'e\' f\u00a0gAB\nnext\nlast')
		expect(htmlToText('&unknown; stays')).toBe('&unknown; stays')
	})

	it('strips inline tags and breaks after headings and list items', () => {
		expect(
			htmlToText(
				'<h1>Title</h1><ul><li><p>one <strong>bold</strong></p></li><li><p>two</p></li></ul>'
			)
		).toBe('Title\none bold\ntwo')
		expect(htmlToText('plain text')).toBe('plain text')
	})
})

describe('installMonospaceTextMeasure', () => {
	function createMeasurer() {
		const textMeasure = {} as Editor['textMeasure']
		installMonospaceTextMeasure({ textMeasure } as unknown as Editor)
		return textMeasure
	}

	const htmlOpts: TLMeasureTextOpts = {
		fontStyle: 'normal',
		fontWeight: 'normal',
		fontFamily: 'tldraw_mono',
		fontSize: 16,
		lineHeight: 1.35,
		maxWidth: null,
		padding: '0px',
	}

	const spanOpts: TLMeasureTextSpanOpts = {
		overflow: 'wrap',
		width: 80,
		height: 100,
		padding: 8,
		fontSize: 16,
		fontWeight: 'normal',
		fontFamily: 'tldraw_mono',
		fontStyle: 'normal',
		lineHeight: 1.35,
		textAlign: 'start',
	}

	it('measureHtml returns cells × cell size plus padding on both sides', () => {
		const m = createMeasurer()
		expect(m.measureHtml('<p dir="auto">hello</p>', htmlOpts)).toEqual({
			x: 0,
			y: 0,
			w: 5 * CELL_W,
			h: CELL_H,
			scrollWidth: 0,
		})
		expect(m.measureHtml('<p>hello</p><p>hi</p>', { ...htmlOpts, padding: '16px' })).toEqual({
			x: 0,
			y: 0,
			w: 5 * CELL_W + 32,
			h: 2 * CELL_H + 32,
			scrollWidth: 0,
		})
		// Empty text still occupies one line.
		expect(m.measureHtml('', htmlOpts)).toEqual({ x: 0, y: 0, w: 0, h: CELL_H, scrollWidth: 0 })
		expect(
			m.measureHtml('<p>wide</p>', { ...htmlOpts, measureScrollWidth: true }).scrollWidth
		).toBe(4 * CELL_W)
	})

	it('measureHtml wraps inside maxWidth minus padding and honours minWidth', () => {
		const m = createMeasurer()
		// 9 cells of content inside 16 px padding.
		const wrapped = m.measureHtml('<p>hello big world</p>', {
			...htmlOpts,
			maxWidth: 9 * CELL_W + 32,
			padding: '16px',
		})
		expect(wrapped).toEqual({ x: 0, y: 0, w: 9 * CELL_W + 32, h: 2 * CELL_H + 32, scrollWidth: 0 })
		// maxWidth null never wraps, however long the line.
		expect(m.measureHtml('<p>hello big world</p>', htmlOpts).w).toBe(15 * CELL_W)
		expect(m.measureHtml('<p>hi</p>', { ...htmlOpts, minWidth: 100 }).w).toBe(100)
		expect(m.measureHtml('<p>hi</p>', { ...htmlOpts, minWidth: 100, padding: '4px' }).w).toBe(108)
	})

	it('measureHtmlBatch maps measureHtml over the requests in order', () => {
		const m = createMeasurer()
		const results = m.measureHtmlBatch([
			{ html: '<p>a</p>', opts: htmlOpts },
			{ html: '<p>abc</p><p>d</p>', opts: { ...htmlOpts, padding: '2px' } },
		])
		expect(results).toEqual([
			{ x: 0, y: 0, w: CELL_W, h: CELL_H, scrollWidth: 0 },
			{ x: 0, y: 0, w: 3 * CELL_W + 4, h: 2 * CELL_H + 4, scrollWidth: 0 },
		])
	})

	it('measureText measures plain text with its newlines', () => {
		const m = createMeasurer()
		expect(m.measureText('a\nbb', htmlOpts)).toEqual({
			x: 0,
			y: 0,
			w: 2 * CELL_W,
			h: 2 * CELL_H,
			scrollWidth: 0,
		})
		// Plain text is not HTML: an entity-looking string is measured as typed.
		expect(m.measureText('&amp;', htmlOpts).w).toBe(5 * CELL_W)
	})

	it('measureTextSpans lays one span per line inside the padded box', () => {
		const m = createMeasurer()
		// 80 - 2 × 8 = 64 px = 8 cells per line.
		expect(m.measureTextSpans('hello big world', spanOpts)).toEqual([
			{ text: 'hello', box: { x: 8, y: 8, w: 5 * CELL_W, h: CELL_H } },
			{ text: 'big', box: { x: 8, y: 8 + CELL_H, w: 3 * CELL_W, h: CELL_H } },
			{ text: 'world', box: { x: 8, y: 8 + 2 * CELL_H, w: 5 * CELL_W, h: CELL_H } },
		])
		expect(m.measureTextSpans('', spanOpts)).toEqual([])
	})

	it('measureTextSpans truncates frame headings to one line and aligns them', () => {
		const m = createMeasurer()
		const truncated = { ...spanOpts, overflow: 'truncate-ellipsis' as const }
		expect(m.measureTextSpans('hello big world', truncated)).toEqual([
			{ text: 'hello…', box: { x: 8, y: 8, w: 6 * CELL_W, h: CELL_H } },
		])
		expect(m.measureTextSpans('hello big world', { ...truncated, textAlign: 'middle' })).toEqual([
			{ text: 'hello…', box: { x: 8 + (64 - 6 * CELL_W) / 2, y: 8, w: 6 * CELL_W, h: CELL_H } },
		])
		expect(m.measureTextSpans('hello big world', { ...truncated, textAlign: 'end' })).toEqual([
			{ text: 'hello…', box: { x: 8 + 64 - 6 * CELL_W, y: 8, w: 6 * CELL_W, h: CELL_H } },
		])
		expect(
			m.measureTextSpans('hello big world', { ...spanOpts, overflow: 'truncate-clip' })
		).toEqual([{ text: 'hello', box: { x: 8, y: 8, w: 5 * CELL_W, h: CELL_H } }])
	})
})
