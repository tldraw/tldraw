import { describe, expect, it } from 'vitest'
import { approximateTextMeasurer } from './approximateTextMeasurer'
import { TLMeasureTextOpts, TLTextMeasurer } from './TextManager'

const baseOpts: TLMeasureTextOpts = {
	fontStyle: 'normal',
	fontWeight: 'normal',
	fontFamily: 'tldraw_sans',
	fontSize: 24,
	lineHeight: 1.35,
	maxWidth: null,
	padding: '0px',
}

/**
 * Invariants every `TLTextMeasurer` must satisfy, whatever its accuracy. Assertions here are
 * semantic (monotonicity, batch/single agreement), never exact pixel values, so an accurate
 * layout-backed measurer can pass the same suite — run it against any new implementation before
 * wiring it into an editor. (The suite currently lives here because this file holds its only
 * subject; lift it somewhere shareable when a second implementation exists.)
 *
 * Line endings: `TextManager` normalizes `\r\n`/`\r` to `\n` before delegating `measureText`
 * and `measureTextSpans`, so measurers may assume `\n`-only input.
 */
function describeTextMeasurerConformance(name: string, measurer: TLTextMeasurer) {
	describe(`${name}: TLTextMeasurer conformance`, () => {
		it('returns finite, non-negative sizes anchored at the origin', () => {
			for (const text of ['', 'a', 'hello world', 'multi\nline\ntext']) {
				const size = measurer.measureText(text, baseOpts)
				expect(size.x).toBe(0)
				expect(size.y).toBe(0)
				expect(size.w).toBeGreaterThanOrEqual(0)
				expect(size.h).toBeGreaterThanOrEqual(0)
				expect(Number.isFinite(size.w)).toBe(true)
				expect(Number.isFinite(size.h)).toBe(true)
			}
		})

		it('measures longer text at least as wide as its prefix', () => {
			const short = measurer.measureText('hello', baseOpts)
			const long = measurer.measureText('hello hello hello', baseOpts)
			expect(long.w).toBeGreaterThanOrEqual(short.w)
		})

		it('measures more lines taller than fewer', () => {
			const one = measurer.measureText('hello', baseOpts)
			const three = measurer.measureText('hello\nhello\nhello', baseOpts)
			expect(three.h).toBeGreaterThan(one.h)
		})

		it('measures wrapped text at least as tall as unwrapped', () => {
			const unwrapped = measurer.measureText('several words that will wrap', baseOpts)
			const wrapped = measurer.measureText('several words that will wrap', {
				...baseOpts,
				maxWidth: 100,
			})
			expect(wrapped.h).toBeGreaterThanOrEqual(unwrapped.h)
		})

		it('reports no scrollWidth unless asked to measure it', () => {
			const size = measurer.measureText('hello world', baseOpts)
			expect(size.scrollWidth).toBe(0)
			const withScroll = measurer.measureText('hello world', {
				...baseOpts,
				measureScrollWidth: true,
			})
			expect(withScroll.scrollWidth).toBeGreaterThan(0)
		})

		it('measures html consistently with its batch form', () => {
			const requests = [
				{ html: '<p dir="auto">one</p>', opts: baseOpts },
				{ html: '<p dir="auto">two two two</p>', opts: { ...baseOpts, maxWidth: 100 } },
				{ html: '<p dir="auto">a</p><p dir="auto">b</p>', opts: baseOpts },
			]
			const batched = measurer.measureHtmlBatch(requests)
			const single = requests.map((r) => measurer.measureHtml(r.html, r.opts))
			// Exact equality is part of the batch contract: same inputs, same numbers. An
			// implementation whose batch path can drift from its single path fails by design.
			expect(batched).toEqual(single)
		})

		it('returns an empty batch for empty requests', () => {
			expect(measurer.measureHtmlBatch([])).toEqual([])
		})

		it('measures two paragraphs the same height as two plain-text lines', () => {
			const fromHtml = measurer.measureHtml('<p dir="auto">one</p><p dir="auto">two</p>', baseOpts)
			const fromText = measurer.measureText('one\ntwo', baseOpts)
			expect(fromHtml.h).toBeCloseTo(fromText.h)
		})

		it('tolerates the optional richText passthrough', () => {
			const richText = {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
			}
			const withRichText = measurer.measureHtml('<p dir="auto">hello</p>', {
				...baseOpts,
				richText,
			})
			expect(Number.isFinite(withRichText.w)).toBe(true)
			expect(Number.isFinite(withRichText.h)).toBe(true)
		})

		it('returns non-empty spans with finite boxes for non-empty text', () => {
			const spans = measurer.measureTextSpans('hello world', {
				overflow: 'wrap',
				width: 200,
				height: 100,
				padding: 0,
				fontSize: 24,
				fontWeight: 'normal',
				fontFamily: 'tldraw_sans',
				fontStyle: 'normal',
				lineHeight: 1.35,
				textAlign: 'middle',
			})
			expect(spans.length).toBeGreaterThan(0)
			for (const span of spans) {
				expect(span.text.length).toBeGreaterThan(0)
				expect(Number.isFinite(span.box.w)).toBe(true)
				expect(Number.isFinite(span.box.h)).toBe(true)
			}
		})
	})
}

describeTextMeasurerConformance('approximateTextMeasurer', approximateTextMeasurer)

describe('approximateTextMeasurer', () => {
	it('scales width with character count and font size', () => {
		expect(approximateTextMeasurer.measureText('aaaa', baseOpts).w).toBe(4 * (24 / 2))
		expect(approximateTextMeasurer.measureText('aaaa', { ...baseOpts, fontSize: 30 }).w).toBe(
			4 * (30 / 2)
		)
	})

	it('sizes by the longest line and counts lines into the height', () => {
		const size = approximateTextMeasurer.measureText('a\naaaa\naa', baseOpts)
		expect(size.w).toBe(4 * (24 / 2))
		expect(size.h).toBe(3 * 24)
	})

	it('splits paragraphs into lines whatever the dir attribute', () => {
		// Pasted or explicitly-directed content renders with dir="rtl"/"ltr", not dir="auto".
		const auto = approximateTextMeasurer.measureHtml(
			'<p dir="auto">one</p><p dir="auto">two</p>',
			baseOpts
		)
		const rtl = approximateTextMeasurer.measureHtml(
			'<p dir="rtl">one</p><p dir="rtl">two</p>',
			baseOpts
		)
		const fromText = approximateTextMeasurer.measureText('one\ntwo', baseOpts)
		expect(auto).toEqual(fromText)
		expect(rtl).toEqual(fromText)
	})

	it('treats headings as their own lines', () => {
		const size = approximateTextMeasurer.measureHtml(
			'<h1>Title</h1><p dir="auto">body</p>',
			baseOpts
		)
		expect(size).toEqual(approximateTextMeasurer.measureText('Title\nbody', baseOpts))
	})

	it('decodes escaped entities before counting characters', () => {
		const size = approximateTextMeasurer.measureHtml('<p dir="auto">A &amp; B</p>', baseOpts)
		expect(size.w).toBe('A & B'.length * (24 / 2))
	})

	it('preserves empty paragraphs as blank lines', () => {
		const size = approximateTextMeasurer.measureHtml(
			'<p dir="auto"></p><p dir="auto">x</p>',
			baseOpts
		)
		expect(size.h).toBe(2 * 24)
	})

	it("preserves the serializer's empty-paragraph filler as a blank line, not two", () => {
		// renderHtmlFromRichTextForMeasurement emits <p ...><br /></p> for empty paragraphs
		const size = approximateTextMeasurer.measureHtml(
			'<p dir="auto"><br /></p><p dir="auto">x</p>',
			baseOpts
		)
		expect(size.h).toBe(2 * 24)
	})

	it('counts hard breaks as line breaks', () => {
		const size = approximateTextMeasurer.measureHtml('<p dir="auto">line1<br />line2</p>', baseOpts)
		expect(size).toEqual(approximateTextMeasurer.measureText('line1\nline2', baseOpts))
	})

	it('measures list items as separate lines', () => {
		const size = approximateTextMeasurer.measureHtml(
			'<ul><li><p dir="auto">a</p></li><li><p dir="auto">b</p></li></ul>',
			baseOpts
		)
		expect(size).toEqual(approximateTextMeasurer.measureText('a\nb', baseOpts))
	})

	it('ignores pretty-printing whitespace between tags', () => {
		const size = approximateTextMeasurer.measureHtml(
			'<p dir="auto">a</p>\n\t<p dir="auto">b</p>',
			baseOpts
		)
		expect(size).toEqual(approximateTextMeasurer.measureText('a\nb', baseOpts))
	})

	it('treats maxWidth: 0 as no wrapping, like the DOM path', () => {
		const size = approximateTextMeasurer.measureText('hello', { ...baseOpts, maxWidth: 0 })
		expect(size).toEqual(approximateTextMeasurer.measureText('hello', baseOpts))
	})

	it('clamps wrapped width UP to maxWidth — a documented divergence from DOM semantics', () => {
		// The DOM measurer guarantees wrapped w <= maxWidth; this approximation returns at
		// least maxWidth instead. Tests encode this legacy behavior, so it is pinned here to
		// make the divergence visible — an accurate measurer must NOT copy it.
		const size = approximateTextMeasurer.measureText('hi', { ...baseOpts, maxWidth: 300 })
		expect(size.w).toBe(300)
	})

	it('is frozen: the shared singleton cannot be patched', () => {
		expect(Object.isFrozen(approximateTextMeasurer)).toBe(true)
	})
})
