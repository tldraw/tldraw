export type GlyphTier = 'rich' | 'safe' | 'ascii'

export const GLYPH_TIERS: readonly GlyphTier[] = ['rich', 'safe', 'ascii']

/**
 * Every glyph the TUI draws, by semantic name, so one switch changes the whole look. Box tables
 * are indexed by a line mask (N=1, E=2, S=4, W=8); quadrant tables by quadrant bits (TL=1, TR=2,
 * BL=4, BR=8). Nothing here may have East Asian Width W/F or Emoji_Presentation (see chars.test.ts):
 * such glyphs take two cells, or render as colour emoji, in modern terminals.
 */
export interface GlyphSet {
	readonly tier: GlyphTier
	readonly boxLight: readonly string[]
	readonly boxHeavy: readonly string[]
	readonly boxDouble: readonly string[]
	readonly dashedH: string
	readonly dashedV: string
	readonly dottedH: string
	readonly dottedV: string
	readonly dashedHeavyH: string
	readonly dashedHeavyV: string
	readonly dottedHeavyH: string
	readonly dottedHeavyV: string
	readonly braille: boolean
	readonly brailleBase: number
	readonly quadrants: readonly string[]
	readonly blockFull: string
	readonly shadeLight: string
	readonly shadeMedium: string
	readonly arrowUp: string
	readonly arrowDown: string
	readonly arrowLeft: string
	readonly arrowRight: string
	readonly barUp: string
	readonly barDown: string
	readonly barLeft: string
	readonly barRight: string
	readonly dot: string
	readonly square: string
	readonly diamond: string
	readonly halfDiscLeft: string
	readonly halfDiscRight: string
	readonly diagonalUp: string
	readonly diagonalDown: string
	readonly gridDot: string
	readonly patternFill: string
	readonly linedFill: string
	readonly ellipsis: string
	readonly bullet: string
	readonly cursorCross: string
	readonly cursorMove: string
	readonly cursorGrab: string
	readonly cursorEw: string
	readonly cursorNs: string
	readonly cursorNwse: string
	readonly cursorNesw: string
	readonly cursorRotate: string
	readonly cursorText: string
	readonly cursorPointer: string
	readonly undo: string
	readonly redo: string
	readonly menu: string
	readonly help: string
	readonly check: string
	readonly caretUp: string
	readonly caretDown: string
	readonly caretLeft: string
	readonly caretRight: string
}

// Index = N | E<<1 | S<<2 | W<<3. Entry 0 is unused (no line); stubs 1/2/4/8 are half lines.
const BOX_LIGHT = [' ', '╵', '╶', '└', '╷', '│', '┌', '├', '╴', '┘', '─', '┴', '┐', '┤', '┬', '┼']
const BOX_HEAVY = [' ', '╹', '╺', '┗', '╻', '┃', '┏', '┣', '╸', '┛', '━', '┻', '┓', '┫', '┳', '╋']
const BOX_DOUBLE = [' ', '║', '═', '╚', '║', '║', '╔', '╠', '═', '╝', '═', '╩', '╗', '╣', '╦', '╬']
const BOX_ASCII = [' ', '|', '-', '+', '|', '|', '+', '+', '-', '+', '-', '+', '+', '+', '+', '+']
const BOX_ASCII_HEAVY = [
	' ',
	'|',
	'=',
	'+',
	'|',
	'|',
	'+',
	'+',
	'=',
	'+',
	'=',
	'+',
	'+',
	'+',
	'+',
	'+',
]

const QUADRANTS = ['', '▘', '▝', '▀', '▖', '▌', '▞', '▛', '▗', '▚', '▐', '▜', '▄', '▙', '▟', '█']
const QUADRANTS_ASCII = [
	'',
	'`',
	"'",
	'"',
	',',
	'[',
	'/',
	'#',
	'.',
	'\\',
	']',
	'#',
	'_',
	'#',
	'#',
	'#',
]

const RICH: GlyphSet = {
	tier: 'rich',
	boxLight: BOX_LIGHT,
	boxHeavy: BOX_HEAVY,
	boxDouble: BOX_DOUBLE,
	dashedH: '╌',
	dashedV: '╎',
	dottedH: '┄',
	dottedV: '┆',
	dashedHeavyH: '╍',
	dashedHeavyV: '╏',
	dottedHeavyH: '┅',
	dottedHeavyV: '┇',
	braille: true,
	brailleBase: 0x2800,
	quadrants: QUADRANTS,
	blockFull: '█',
	shadeLight: '░',
	shadeMedium: '▒',
	arrowUp: '▲',
	arrowDown: '▼',
	arrowLeft: '◄',
	arrowRight: '►',
	barUp: '┬',
	barDown: '┴',
	barLeft: '├',
	barRight: '┤',
	dot: '●',
	square: '■',
	diamond: '◆',
	halfDiscLeft: '◖',
	halfDiscRight: '◗',
	diagonalUp: '/',
	diagonalDown: '\\',
	gridDot: '·',
	patternFill: '░',
	linedFill: '╌',
	ellipsis: '…',
	bullet: '•',
	cursorCross: '✛',
	cursorMove: '✥',
	cursorGrab: '✥',
	cursorEw: '↔',
	cursorNs: '↕',
	cursorNwse: '⤡',
	cursorNesw: '⤢',
	cursorRotate: '↻',
	cursorText: 'I',
	cursorPointer: '+',
	undo: '↶',
	redo: '↷',
	menu: '≡',
	help: '?',
	check: '✓',
	caretUp: '▴',
	caretDown: '▾',
	caretLeft: '◄',
	caretRight: '►',
}

const SAFE: GlyphSet = {
	...RICH,
	tier: 'safe',
	bullet: '·',
	cursorCross: '+',
	cursorMove: '+',
	cursorGrab: '+',
	cursorEw: '-',
	cursorNs: '|',
	cursorNwse: '\\',
	cursorNesw: '/',
	cursorRotate: '@',
	undo: '<',
	redo: '>',
	menu: '=',
	check: 'x',
	caretUp: '▲',
	caretDown: '▼',
}

const ASCII: GlyphSet = {
	tier: 'ascii',
	boxLight: BOX_ASCII,
	boxHeavy: BOX_ASCII_HEAVY,
	boxDouble: BOX_ASCII_HEAVY,
	dashedH: '-',
	dashedV: ':',
	dottedH: '.',
	dottedV: ':',
	dashedHeavyH: '=',
	dashedHeavyV: ':',
	dottedHeavyH: '.',
	dottedHeavyV: ':',
	braille: false,
	brailleBase: 0,
	quadrants: QUADRANTS_ASCII,
	blockFull: '#',
	shadeLight: '.',
	shadeMedium: ':',
	arrowUp: '^',
	arrowDown: 'v',
	arrowLeft: '<',
	arrowRight: '>',
	barUp: '-',
	barDown: '-',
	barLeft: '|',
	barRight: '|',
	dot: '*',
	square: '#',
	diamond: '+',
	halfDiscLeft: '(',
	halfDiscRight: ')',
	diagonalUp: '/',
	diagonalDown: '\\',
	gridDot: '.',
	patternFill: ':',
	linedFill: '-',
	ellipsis: '~',
	bullet: '*',
	cursorCross: '+',
	cursorMove: '+',
	cursorGrab: '+',
	cursorEw: '-',
	cursorNs: '|',
	cursorNwse: '\\',
	cursorNesw: '/',
	cursorRotate: '@',
	cursorText: 'I',
	cursorPointer: '+',
	undo: '<',
	redo: '>',
	menu: '=',
	help: '?',
	check: 'x',
	caretUp: '^',
	caretDown: 'v',
	caretLeft: '<',
	caretRight: '>',
}

export const GLYPHS: Readonly<Record<GlyphTier, GlyphSet>> = {
	rich: RICH,
	safe: SAFE,
	ascii: ASCII,
}

export function getGlyphs(tier: GlyphTier): GlyphSet {
	return GLYPHS[tier]
}

/** Every drawable glyph in a set (tables flattened, empty entries dropped), for tests. */
export function listTierGlyphs(set: GlyphSet): string[] {
	const out: string[] = []
	for (const [key, value] of Object.entries(set)) {
		if (key === 'tier') continue
		if (typeof value === 'string') {
			if (value.length > 0) out.push(value)
		} else if (Array.isArray(value)) {
			for (const g of value) if (g.length > 0) out.push(g)
		}
	}
	return out
}

/**
 * A braille cell for a 2x4 dot bitmap (bit i = dot i in Unicode's braille order: column-major,
 * dots 1-3 left, 4-6 right, 7 bottom-left, 8 bottom-right). U+2800 is never emitted because some
 * fallback fonts draw the blank pattern as a box; a space is returned instead.
 */
export function brailleGlyph(set: GlyphSet, bits: number): string {
	if (bits === 0) return ' '
	if (set.braille) return String.fromCharCode(set.brailleBase + (bits & 0xff))
	let n = 0
	for (let b = bits & 0xff; b; b >>= 1) n += b & 1
	return n <= 2 ? '.' : n <= 4 ? ':' : n <= 6 ? '+' : '#'
}

/** A block-quadrant cell for a 2x2 bitmap (TL=1, TR=2, BL=4, BR=8); 0 is a space. */
export function quadrantGlyph(set: GlyphSet, bits: number): string {
	if ((bits & 15) === 0) return ' '
	return set.quadrants[bits & 15]
}
