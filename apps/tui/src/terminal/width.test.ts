import { describe, expect, it } from 'vitest'
import { cellWidth, graphemes, stringWidth } from './width'

describe('graphemes', () => {
	it('splits plain ascii per character', () => {
		expect(graphemes('abc')).toEqual(['a', 'b', 'c'])
		expect(graphemes('')).toEqual([])
	})

	it('keeps combining sequences, emoji sequences and CRLF together', () => {
		expect(graphemes('éa')).toEqual(['é', 'a'])
		expect(graphemes('👨‍👩‍👧x')).toEqual(['👨‍👩‍👧', 'x'])
		expect(graphemes('🇺🇸🇫🇷')).toEqual(['🇺🇸', '🇫🇷'])
		expect(graphemes('a\r\nb')).toEqual(['a', '\r\n', 'b'])
	})

	it('splits CJK into single code points', () => {
		expect(graphemes('日本語')).toEqual(['日', '本', '語'])
	})
})

describe('cellWidth', () => {
	it('is 1 for printable ascii and latin', () => {
		expect(cellWidth('a')).toBe(1)
		expect(cellWidth(' ')).toBe(1)
		expect(cellWidth('é')).toBe(1)
		expect(cellWidth('ß')).toBe(1)
	})

	it('is 0 for control characters so the caller can substitute a placeholder', () => {
		expect(cellWidth('\x1b')).toBe(0)
		expect(cellWidth('\t')).toBe(0)
		expect(cellWidth('\n')).toBe(0)
		expect(cellWidth('\x7f')).toBe(0)
		expect(cellWidth('\x9b')).toBe(0)
		expect(cellWidth('')).toBe(0)
	})

	it('is 0 for lone combining marks and format characters, 1 for a base plus marks', () => {
		expect(cellWidth('́')).toBe(0)
		expect(cellWidth('​')).toBe(0)
		expect(cellWidth('‍')).toBe(0)
		expect(cellWidth('é')).toBe(1)
		expect(cellWidth('é̂')).toBe(1)
	})

	it('is 2 for East Asian Wide and Fullwidth characters', () => {
		expect(cellWidth('字')).toBe(2)
		expect(cellWidth('あ')).toBe(2)
		expect(cellWidth('한')).toBe(2)
		expect(cellWidth('Ａ')).toBe(2)
		expect(cellWidth('😀')).toBe(2)
	})

	it('is 2 for VS16, ZWJ and regional indicator sequences', () => {
		expect(cellWidth('☺️')).toBe(2)
		expect(cellWidth('👨‍👩‍👧')).toBe(2)
		expect(cellWidth('🇺🇸')).toBe(2)
		expect(cellWidth('❤️')).toBe(2)
	})

	it('keeps a text presentation selector narrow', () => {
		expect(cellWidth('☺︎')).toBe(1)
	})

	it('treats East Asian Ambiguous characters as 1 unless the terminal was probed wide', () => {
		for (const g of ['─', '│', '┼', '■', '▲', '●', '·', '█', '≡', '…']) {
			expect(cellWidth(g)).toBe(1)
			expect(cellWidth(g, true)).toBe(2)
		}
		// Neutral characters never widen.
		expect(cellWidth('a', true)).toBe(1)
		expect(cellWidth('╴', true)).toBe(1)
	})
})

describe('stringWidth', () => {
	it('sums per-grapheme widths', () => {
		expect(stringWidth('')).toBe(0)
		expect(stringWidth('abc')).toBe(3)
		expect(stringWidth('a字b')).toBe(4)
		expect(stringWidth('é')).toBe(1)
		expect(stringWidth('👨‍👩‍👧!')).toBe(3)
	})

	it('ignores control characters', () => {
		expect(stringWidth('a\tb')).toBe(2)
		expect(stringWidth('a\r\nb')).toBe(2)
		expect(stringWidth('\x1b[31m')).toBe(4)
	})

	it('honours the ambiguous flag like cellWidth', () => {
		expect(stringWidth('─┼─')).toBe(3)
		expect(stringWidth('─┼─', true)).toBe(6)
	})

	it('matches the sum of cellWidth over graphemes for mixed text', () => {
		const s = 'Hi 日本 😀 é 🇺🇸 ─'
		let sum = 0
		for (const g of graphemes(s)) sum += cellWidth(g)
		expect(stringWidth(s)).toBe(sum)
	})
})
