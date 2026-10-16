import { eastAsianWidthType } from 'get-east-asian-width'
import { describe, expect, it } from 'vitest'
import {
	asciiSafe,
	brailleGlyph,
	getGlyphs,
	GLYPH_TIERS,
	GLYPHS,
	GlyphTier,
	listTierGlyphs,
	quadrantGlyph,
} from './chars'
import { cellWidth, graphemes } from './width'

const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u
const BANNED = ['✋', '▶', '◀', '🔍', '⠀']

describe('glyph tiers', () => {
	it('exposes exactly the three tiers', () => {
		expect(GLYPH_TIERS).toEqual(['rich', 'safe', 'ascii'])
		for (const tier of GLYPH_TIERS) expect(getGlyphs(tier).tier).toBe(tier)
	})

	it.each(GLYPH_TIERS)('%s: every glyph is a single grapheme one cell wide', (tier: GlyphTier) => {
		for (const g of listTierGlyphs(GLYPHS[tier])) {
			expect(graphemes(g), `${tier} glyph ${JSON.stringify(g)}`).toHaveLength(1)
			expect(cellWidth(g), `${tier} glyph ${JSON.stringify(g)}`).toBe(1)
		}
	})

	it.each(GLYPH_TIERS)(
		'%s: no glyph is East Asian Wide/Fullwidth or Emoji_Presentation',
		(tier) => {
			for (const g of listTierGlyphs(GLYPHS[tier])) {
				const cp = g.codePointAt(0)!
				const eaw = eastAsianWidthType(cp)
				expect(eaw, `${tier} glyph ${g} U+${cp.toString(16)}`).not.toBe('wide')
				expect(eaw, `${tier} glyph ${g} U+${cp.toString(16)}`).not.toBe('fullwidth')
				expect(EMOJI_PRESENTATION.test(g), `${tier} glyph ${g} has emoji presentation`).toBe(false)
			}
		}
	)

	it.each(GLYPH_TIERS)('%s: never uses the banned glyphs', (tier) => {
		const all = new Set(listTierGlyphs(GLYPHS[tier]))
		for (const b of BANNED) expect(all.has(b), `${tier} contains ${b}`).toBe(false)
	})

	it('uses ►◄ for horizontal arrowheads in the unicode tiers and ascii in the ascii tier', () => {
		expect(GLYPHS.rich.arrowRight).toBe('►')
		expect(GLYPHS.rich.arrowLeft).toBe('◄')
		expect(GLYPHS.safe.arrowRight).toBe('►')
		expect(GLYPHS.safe.arrowLeft).toBe('◄')
		expect(GLYPHS.ascii.arrowRight).toBe('>')
		expect(GLYPHS.ascii.arrowLeft).toBe('<')
		expect(GLYPHS.ascii.arrowUp).toBe('^')
		expect(GLYPHS.ascii.arrowDown).toBe('v')
	})

	it('ascii tier is pure 7-bit ascii', () => {
		for (const g of listTierGlyphs(GLYPHS.ascii)) {
			expect(g.length).toBe(1)
			expect(g.charCodeAt(0)).toBeLessThan(0x80)
		}
		expect(GLYPHS.ascii.braille).toBe(false)
	})

	it('safe tier only keeps box drawing, braille, block elements, geometric shapes and ascii', () => {
		for (const g of listTierGlyphs(GLYPHS.safe)) {
			const cp = g.codePointAt(0)!
			const ok =
				cp < 0x80 ||
				cp === 0xb7 || // middle dot
				cp === 0x2026 || // ellipsis
				(cp >= 0x2500 && cp <= 0x257f) || // box drawing
				(cp >= 0x2580 && cp <= 0x259f) || // block elements
				(cp >= 0x25a0 && cp <= 0x25ff) // geometric shapes
			expect(ok, `safe tier glyph ${g} U+${cp.toString(16)} is outside the safe blocks`).toBe(true)
		}
	})
})

describe('box tables', () => {
	it.each(GLYPH_TIERS)('%s: 16 entries indexed by N|E<<1|S<<2|W<<3, entry 0 blank', (tier) => {
		const g = GLYPHS[tier]
		for (const table of [g.boxLight, g.boxHeavy, g.boxDouble]) {
			expect(table).toHaveLength(16)
			expect(table[0]).toBe(' ')
			for (let i = 1; i < 16; i++) expect(table[i].length).toBeGreaterThan(0)
		}
	})

	it('rich light table has the expected corners, tees and cross', () => {
		const b = GLYPHS.rich.boxLight
		expect(b[1 | 4]).toBe('│')
		expect(b[2 | 8]).toBe('─')
		expect(b[2 | 4]).toBe('┌')
		expect(b[4 | 8]).toBe('┐')
		expect(b[1 | 2]).toBe('└')
		expect(b[1 | 8]).toBe('┘')
		expect(b[1 | 2 | 4]).toBe('├')
		expect(b[1 | 4 | 8]).toBe('┤')
		expect(b[2 | 4 | 8]).toBe('┬')
		expect(b[1 | 2 | 8]).toBe('┴')
		expect(b[15]).toBe('┼')
		expect(b[1]).toBe('╵')
		expect(b[2]).toBe('╶')
		expect(b[4]).toBe('╷')
		expect(b[8]).toBe('╴')
	})

	it('rich heavy table mirrors the light one', () => {
		const b = GLYPHS.rich.boxHeavy
		expect(b[1 | 4]).toBe('┃')
		expect(b[2 | 8]).toBe('━')
		expect(b[2 | 4]).toBe('┏')
		expect(b[15]).toBe('╋')
		expect(b[1]).toBe('╹')
	})

	it('ascii table uses -|+', () => {
		const b = GLYPHS.ascii.boxLight
		expect(b[1 | 4]).toBe('|')
		expect(b[2 | 8]).toBe('-')
		expect(b[15]).toBe('+')
		expect(b[2 | 4]).toBe('+')
	})

	it('dashed and dotted glyphs exist per tier', () => {
		expect(GLYPHS.rich.dashedH).toBe('╌')
		expect(GLYPHS.rich.dashedV).toBe('╎')
		expect(GLYPHS.rich.dottedH).toBe('┄')
		expect(GLYPHS.rich.dottedV).toBe('┆')
		expect(GLYPHS.ascii.dashedH).toBe('-')
		expect(GLYPHS.ascii.dashedV).toBe(':')
	})
})

describe('brailleGlyph', () => {
	it('never emits U+2800; blank is a space', () => {
		for (const tier of GLYPH_TIERS) expect(brailleGlyph(GLYPHS[tier], 0)).toBe(' ')
	})

	it('maps dot bits onto the braille block in the unicode tiers', () => {
		expect(brailleGlyph(GLYPHS.rich, 1)).toBe('⠁')
		expect(brailleGlyph(GLYPHS.rich, 0xff)).toBe('⣿')
		expect(brailleGlyph(GLYPHS.safe, 0x40)).toBe('⡀')
		expect(brailleGlyph(GLYPHS.rich, 0x1ff)).toBe('⣿')
	})

	it('approximates dot density with ascii in the ascii tier', () => {
		expect(brailleGlyph(GLYPHS.ascii, 1)).toBe('.')
		expect(brailleGlyph(GLYPHS.ascii, 0b1111)).toBe(':')
		expect(brailleGlyph(GLYPHS.ascii, 0b111111)).toBe('+')
		expect(brailleGlyph(GLYPHS.ascii, 0xff)).toBe('#')
	})
})

describe('quadrantGlyph', () => {
	it('is a space for no quadrants and a full block for all four', () => {
		expect(quadrantGlyph(GLYPHS.rich, 0)).toBe(' ')
		expect(quadrantGlyph(GLYPHS.rich, 15)).toBe('█')
		expect(quadrantGlyph(GLYPHS.ascii, 15)).toBe('#')
	})

	it('maps TL/TR/BL/BR bits to the block elements', () => {
		expect(quadrantGlyph(GLYPHS.rich, 1)).toBe('▘')
		expect(quadrantGlyph(GLYPHS.rich, 2)).toBe('▝')
		expect(quadrantGlyph(GLYPHS.rich, 4)).toBe('▖')
		expect(quadrantGlyph(GLYPHS.rich, 8)).toBe('▗')
		expect(quadrantGlyph(GLYPHS.rich, 1 | 2)).toBe('▀')
		expect(quadrantGlyph(GLYPHS.rich, 4 | 8)).toBe('▄')
		expect(quadrantGlyph(GLYPHS.rich, 1 | 4)).toBe('▌')
		expect(quadrantGlyph(GLYPHS.rich, 2 | 8)).toBe('▐')
		expect(quadrantGlyph(GLYPHS.rich, 1 | 8)).toBe('▚')
		expect(quadrantGlyph(GLYPHS.rich, 2 | 4)).toBe('▞')
	})

	it('ignores bits above the low four', () => {
		expect(quadrantGlyph(GLYPHS.rich, 16 | 1)).toBe('▘')
	})
})

describe('asciiSafe', () => {
	it('rewrites typographic chrome text for the ascii tier only', () => {
		expect(asciiSafe(GLYPHS.ascii, 'Open… · 10× – done')).toBe('Open... * 10x - done')
		expect(asciiSafe(GLYPHS.rich, 'Open… · 10×')).toBe('Open… · 10×')
		expect(asciiSafe(GLYPHS.safe, 'Open…')).toBe('Open…')
	})
})
