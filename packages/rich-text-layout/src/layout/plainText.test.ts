import { beforeAll, describe, expect, it } from 'vitest'
import { createFakeMeasureContext } from '../measure/fake'
import { installMeasureContext } from '../measure/install'
import { layoutPlainText } from './plainText'

// Every grapheme is half the font size wide, so at 20px each character is 10px.
const fake = createFakeMeasureContext({ advance: 0.5, ascent: 0.8, descent: 0.2 })
const style = {
	fontFamily: 'Fake',
	fontSize: 20,
	lineHeight: '30px',
	whiteSpace: 'pre-wrap',
} as const

beforeAll(async () => {
	await installMeasureContext(fake)
})

describe('layoutPlainText', () => {
	it('measures a single line at max-content width', () => {
		const layout = layoutPlainText('hello', { style })
		expect(layout.width).toBe(50)
		expect(layout.height).toBe(30)
		expect(layout.lines).toHaveLength(1)
		expect(layout.lines[0].fragments.map((f) => f.text)).toEqual(['hello'])
		expect(layout.lines[0].baseline).toBe(16 + 5) // ascent + half-leading
	})

	it('wraps at word boundaries', () => {
		const layout = layoutPlainText('aaa bbb ccc', { style, maxWidth: 75 })
		expect(layout.lines.map((l) => l.fragments.map((f) => f.text).join(''))).toEqual([
			'aaa bbb ',
			'ccc',
		])
		expect(layout.width).toBe(75)
		expect(layout.height).toBe(60)
		// trailing preserved space hangs: the line reports content width only
		expect(layout.lines[0].width).toBe(70)
	})

	it('does not wrap when the content fits the max width', () => {
		const layout = layoutPlainText('aaa bbb', { style, maxWidth: 200 })
		expect(layout.width).toBe(70)
		expect(layout.lines).toHaveLength(1)
	})

	it('honours minWidth', () => {
		const layout = layoutPlainText('aa', { style, minWidth: 100 })
		expect(layout.width).toBe(100)
	})

	it('breaks overlong words at graphemes with overflow-wrap: break-word', () => {
		const layout = layoutPlainText('abcdefghij', {
			style: { ...style, overflowWrap: 'break-word' },
			maxWidth: 45,
		})
		expect(layout.lines.map((l) => l.fragments.map((f) => f.text).join(''))).toEqual([
			'abcd',
			'efgh',
			'ij',
		])
	})

	it('lets overlong words overflow with overflow-wrap: normal', () => {
		const layout = layoutPlainText('abcdefghij', { style, maxWidth: 45 })
		expect(layout.lines).toHaveLength(1)
		expect(layout.width).toBe(45)
		expect(layout.lines[0].width).toBe(100)
	})

	it('treats newlines as forced breaks and ignores a trailing one', () => {
		expect(layoutPlainText('a\nb', { style }).lines).toHaveLength(2)
		expect(layoutPlainText('a\n', { style }).lines).toHaveLength(1)
		expect(layoutPlainText('a\n\n', { style }).lines).toHaveLength(2)
		expect(layoutPlainText('\na', { style }).lines).toHaveLength(2)
	})

	it('gives an empty string no height, like an empty element, but a space one line', () => {
		const layout = layoutPlainText('', { style })
		expect(layout.height).toBe(0)
		expect(layout.width).toBe(0)
		expect(layoutPlainText(' ', { style }).height).toBe(30)
		expect(layoutPlainText('\n', { style }).height).toBe(30)
	})

	it('preserves multiple spaces in pre-wrap and counts trailing spaces in max-content width', () => {
		const layout = layoutPlainText('a  b ', { style })
		expect(layout.width).toBe(50)
		expect(layout.lines[0].width).toBe(40)
	})

	it('collapses whitespace in normal mode', () => {
		const layout = layoutPlainText('  a   b  ', { style: { ...style, whiteSpace: 'normal' } })
		expect(layout.width).toBe(30)
		expect(layout.lines[0].fragments.map((f) => f.text)).toEqual(['a', ' ', 'b'])
	})

	it('advances tabs to the next tab stop', () => {
		const layout = layoutPlainText('\ta', { style: { ...style, tabSize: 2 } })
		// tab stop = 2 spaces = 20px, then 'a'
		expect(layout.width).toBe(30)
		expect(layoutPlainText('a\tb', { style: { ...style, tabSize: 4 } }).width).toBe(50)
	})

	it('includes padding in the box', () => {
		const layout = layoutPlainText('ab', { style, padding: 5 })
		expect(layout.width).toBe(30)
		expect(layout.height).toBe(40)
		expect(layout.lines[0].x).toBe(5)
		expect(layout.lines[0].y).toBe(5)
	})

	it('aligns lines within the box', () => {
		const layout = layoutPlainText('aaaa\nab', { style: { ...style, textAlign: 'center' } })
		expect(layout.lines[1].x).toBe(10)
		const right = layoutPlainText('aaaa\nab', { style: { ...style, textAlign: 'end' } })
		expect(right.lines[1].x).toBe(20)
	})

	it('maps fragments back to source offsets', () => {
		const layout = layoutPlainText('ab cd', { style, maxWidth: 25 })
		const [first, second] = layout.lines
		expect(first.fragments.map((f) => [f.text, f.source.from, f.source.to])).toEqual([
			['ab', 0, 2],
			[' ', 2, 3],
		])
		expect(second.fragments.map((f) => [f.text, f.source.from, f.source.to])).toEqual([
			['cd', 3, 5],
		])
	})
})
