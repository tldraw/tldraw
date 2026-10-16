import { eastAsianWidth } from 'get-east-asian-width'

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

// Marks (Mn/Mc/Me) and format characters (Cf: ZWSP, ZWJ, soft hyphen, BOM…) take no cell.
const ZERO_WIDTH_RE = /^[\p{M}\p{Cf}]$/u

function isControl(cp: number): boolean {
	return cp < 0x20 || (cp >= 0x7f && cp < 0xa0)
}

function isZeroWidth(cp: number): boolean {
	return ZERO_WIDTH_RE.test(String.fromCodePoint(cp))
}

function isRegionalIndicator(cp: number): boolean {
	return cp >= 0x1f1e6 && cp <= 0x1f1ff
}

function widthOfCodePoint(cp: number, ambiguousWide: boolean): 0 | 1 | 2 {
	if (cp >= 0x20 && cp < 0x7f) return 1
	if (isControl(cp)) return 0
	if (isZeroWidth(cp)) return 0
	return eastAsianWidth(cp, { ambiguousAsWide: ambiguousWide })
}

function isSimpleAscii(s: string): boolean {
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i)
		// \r is excluded because "\r\n" is a single grapheme cluster under UAX #29.
		if (c > 0x7e || c === 0x0d) return false
	}
	return true
}

/** Splits a string into extended grapheme clusters (UAX #29). */
export function graphemes(s: string): string[] {
	if (isSimpleAscii(s)) return s.split('')
	const out: string[] = []
	for (const seg of segmenter.segment(s)) out.push(seg.segment)
	return out
}

/**
 * Number of terminal cells one grapheme occupies. Control characters are 0 so the caller can
 * substitute a placeholder; lone combining marks are 0; emoji presentation sequences (VS16, ZWJ,
 * regional indicator pairs) are 2; East Asian Ambiguous characters are 1 unless the terminal was
 * probed as rendering them wide.
 */
export function cellWidth(grapheme: string, ambiguousWide = false): 0 | 1 | 2 {
	const len = grapheme.length
	if (len === 0) return 0
	const first = grapheme.charCodeAt(0)
	if (len === 1) return widthOfCodePoint(first, ambiguousWide)

	let width: 0 | 1 | 2 = 0
	let emojiPresentation = false
	for (const ch of grapheme) {
		const cp = ch.codePointAt(0)!
		if (cp === 0xfe0f || cp === 0x200d) {
			emojiPresentation = true
			continue
		}
		if (cp === 0xfe0e) continue
		if (isRegionalIndicator(cp)) return 2
		if (isZeroWidth(cp)) continue
		const w = widthOfCodePoint(cp, ambiguousWide)
		if (w > width) width = w
	}
	if (emojiPresentation && width > 0) return 2
	return width
}

/** Total cell width of a string, measured per grapheme like `Screen.text` renders it. */
export function stringWidth(s: string, ambiguousWide = false): number {
	if (isSimpleAscii(s)) {
		let n = 0
		for (let i = 0; i < s.length; i++) {
			const c = s.charCodeAt(i)
			if (c >= 0x20 && c < 0x7f) n++
		}
		return n
	}
	let n = 0
	for (const seg of segmenter.segment(s)) n += cellWidth(seg.segment, ambiguousWide)
	return n
}
