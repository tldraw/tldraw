import { describe, expect, it } from 'vitest'
import { ansiToGrid, stripAnsi } from '../test/FakeTerminal'
import { getGlyphs } from './chars'
import {
	LINE_E,
	LINE_N,
	LINE_S,
	LINE_W,
	lineGlyph,
	LineStyle,
	Rect,
	Screen,
	ScreenOptions,
} from './Screen'

const CUP = (row: number, col: number) => `\x1b[${row};${col}H`
const SYNC_START = '\x1b[?2026h'
const SYNC_END = '\x1b[?2026l'
const LIGHT: LineStyle = { fg: -1, weight: 'light' }

function make(cols: number, rows: number, opts?: Partial<ScreenOptions>) {
	return new Screen(cols, rows, { syncOutput: false, ...opts })
}

/** Draws a rectangle outline through the line layer the way a rasterizer would. */
function box(screen: Screen, r: Rect, style: LineStyle = LIGHT) {
	const x1 = r.x + r.w - 1
	const y1 = r.y + r.h - 1
	for (let x = r.x; x <= x1; x++) {
		let mask = LINE_E | LINE_W
		if (x === r.x) mask = LINE_E
		if (x === x1) mask = LINE_W
		screen.line(x, r.y, mask | (x === r.x || x === x1 ? LINE_S : 0), style)
		screen.line(x, y1, mask | (x === r.x || x === x1 ? LINE_N : 0), style)
	}
	for (let y = r.y + 1; y < y1; y++) {
		screen.line(r.x, y, LINE_N | LINE_S, style)
		screen.line(x1, y, LINE_N | LINE_S, style)
	}
}

describe('Screen cells', () => {
	it('starts blank with terminal default colours', () => {
		const s = make(3, 2)
		expect(s.cols).toBe(3)
		expect(s.rows).toBe(2)
		expect(s.getCell(0, 0)).toEqual({ glyph: ' ', style: { fg: -1, bg: -1 } })
		expect(s.getCell(2, 1)).toEqual({ glyph: ' ', style: { fg: -1, bg: -1 } })
		expect(s.getCell(3, 0)).toBeUndefined()
		expect(s.getCell(0, 2)).toBeUndefined()
		expect(s.getCell(-1, 0)).toBeUndefined()
		expect(s.toText()).toBe('\n')
	})

	it('clamps a degenerate size to one cell', () => {
		const s = make(0, -3)
		expect(s.cols).toBe(1)
		expect(s.rows).toBe(1)
	})

	it('put writes a glyph with a partial style and ignores out-of-bounds cells', () => {
		const s = make(3, 2)
		s.put(1, 0, 'a', { fg: 0xff0000, bold: true })
		expect(s.getCell(1, 0)).toEqual({ glyph: 'a', style: { fg: 0xff0000, bg: -1, bold: true } })
		s.put(1, 0, 'b', { bg: 0x00ff00 })
		expect(s.getCell(1, 0)).toEqual({
			glyph: 'b',
			style: { fg: 0xff0000, bg: 0x00ff00, bold: true },
		})
		s.put(1, 0, 'c', { bold: false, dim: true, italic: true, underline: true, inverse: true })
		expect(s.getCell(1, 0)!.style).toEqual({
			fg: 0xff0000,
			bg: 0x00ff00,
			dim: true,
			italic: true,
			underline: true,
			inverse: true,
		})
		s.put(5, 5, 'z')
		s.put(-1, 0, 'z')
		s.put(0, -1, 'z')
		expect(s.toText()).toBe(' c\n')
	})

	it('put turns control characters into ? and drops zero-width glyphs and empty strings', () => {
		const s = make(4, 1)
		s.put(0, 0, '\x1b')
		s.put(1, 0, '\t')
		s.put(2, 0, '́')
		s.put(3, 0, '')
		expect(s.toText()).toBe('??')
	})

	it('put keeps a combining sequence in one cell and never emits braille blank', () => {
		const s = make(3, 1)
		s.put(0, 0, 'é')
		s.put(1, 0, '⠀')
		s.put(2, 0, '⠁')
		expect(s.getCell(0, 0)!.glyph).toBe('é')
		expect(s.getCell(1, 0)!.glyph).toBe(' ')
		expect(s.getCell(2, 0)!.glyph).toBe('⠁')
		expect(s.toText()).toBe('é ⠁')
	})

	it('text is grapheme-aware, honours maxWidth and returns the cells used', () => {
		const s = make(10, 2)
		expect(s.text(0, 0, 'héllo')).toBe(5)
		expect(s.toText().split('\n')[0]).toBe('héllo')
		expect(s.text(0, 1, '日本語', undefined, 5)).toBe(4)
		expect(s.toText().split('\n')[1]).toBe('日本')
		expect(s.text(6, 0, 'abcdefgh')).toBe(8)
		expect(s.toText().split('\n')[0]).toBe('héllo abcd')
		expect(s.text(0, 0, '')).toBe(0)
	})

	it('text replaces controls with ? and skips zero-width characters', () => {
		const s = make(6, 1)
		expect(s.text(0, 0, 'a\tb​c')).toBe(4)
		expect(s.toText()).toBe('a?bc')
	})

	it('fillRect fills with one glyph, clipped to the screen', () => {
		const s = make(4, 3)
		s.fillRect({ x: 1, y: 1, w: 10, h: 10 }, '#', { fg: 0x123456 })
		expect(s.toText()).toBe('\n ###\n ###')
		expect(s.getCell(3, 2)!.style.fg).toBe(0x123456)
		s.fillRect({ x: 0, y: 0, w: 0, h: 5 }, 'x')
		s.fillRect({ x: 0, y: 0, w: 2, h: 1 }, '')
		expect(s.toText()).toBe('\n ###\n ###')
	})

	it('setBg, setFg and blendBg change colours without touching glyphs', () => {
		const s = make(2, 1, { background: 0x000000 })
		s.put(0, 0, 'x')
		s.setBg(0, 0, 0x0000ff)
		s.setFg(0, 0, 0xff0000)
		expect(s.getCell(0, 0)).toEqual({ glyph: 'x', style: { fg: 0xff0000, bg: 0x0000ff } })
		s.blendBg(1, 0, 0xffffff, 0.5)
		expect(s.getCell(1, 0)!.style.bg).toBe(0x808080)
		s.blendBg(0, 0, 0xff0000, 0.5)
		expect(s.getCell(0, 0)!.style.bg).toBe(0x800080)
		s.setBg(9, 9, 0xffffff)
		s.setFg(9, 9, 0xffffff)
		s.blendBg(9, 9, 0xffffff, 1)
	})

	it('blendBg blends over the configured terminal background when the cell has none', () => {
		const light = make(1, 1, { background: 0xffffff })
		light.blendBg(0, 0, 0x000000, 0.25)
		expect(light.getCell(0, 0)!.style.bg).toBe(0xbfbfbf)
		const dark = make(1, 1)
		dark.blendBg(0, 0, 0xffffff, 0.25)
		expect(dark.getCell(0, 0)!.style.bg).toBe(0x404040)
	})

	it('clear fills the back buffer with a style and drops the line layer', () => {
		const s = make(3, 1)
		s.put(0, 0, 'a')
		s.line(1, 0, LINE_E | LINE_W, LIGHT)
		s.clear({ bg: 0x111111, fg: 0x222222, dim: true })
		expect(s.toText()).toBe('')
		expect(s.getCell(1, 0)).toEqual({
			glyph: ' ',
			style: { fg: 0x222222, bg: 0x111111, dim: true },
		})
		s.clear()
		expect(s.getCell(1, 0)).toEqual({ glyph: ' ', style: { fg: -1, bg: -1 } })
	})

	it('toText trims trailing spaces per row but keeps leading and inner spaces', () => {
		const s = make(6, 3)
		s.text(1, 0, 'a b')
		s.text(0, 2, 'end  ')
		expect(s.toText()).toBe(' a b\n\nend')
	})
})

describe('Screen wide glyphs', () => {
	it('occupies a lead and a continuation cell', () => {
		const s = make(4, 1)
		s.put(1, 0, '字', { fg: 0xff0000 })
		expect(s.getCell(1, 0)).toEqual({ glyph: '字', style: { fg: 0xff0000, bg: -1 }, wide: true })
		expect(s.getCell(2, 0)).toEqual({ glyph: '', style: { fg: 0xff0000, bg: -1 } })
		expect(s.toText()).toBe(' 字')
	})

	it('breaks the pair when either half is overwritten', () => {
		const s = make(4, 1)
		s.put(1, 0, '字')
		s.put(2, 0, 'x')
		expect(s.getCell(1, 0)).toEqual({ glyph: ' ', style: { fg: -1, bg: -1 } })
		expect(s.getCell(2, 0)!.glyph).toBe('x')
		s.put(1, 0, '字')
		s.put(1, 0, 'y')
		expect(s.getCell(1, 0)!.glyph).toBe('y')
		expect(s.getCell(2, 0)).toEqual({ glyph: ' ', style: { fg: -1, bg: -1 } })
		s.put(1, 0, '字')
		s.put(2, 0, '本')
		expect(s.toText()).toBe('  本')
	})

	it('becomes a space when straddling the last column', () => {
		const s = make(4, 1)
		s.put(3, 0, '字')
		expect(s.getCell(3, 0)).toEqual({ glyph: ' ', style: { fg: -1, bg: -1 } })
		expect(s.toText()).toBe('')
	})

	it('becomes a space when straddling a clip edge on either side', () => {
		const s = make(5, 1)
		s.withClip({ x: 0, y: 0, w: 2, h: 1 }, () => s.put(1, 0, '字', { fg: 1 }))
		expect(s.getCell(1, 0)).toEqual({ glyph: ' ', style: { fg: 1, bg: -1 } })
		expect(s.getCell(2, 0)).toEqual({ glyph: ' ', style: { fg: -1, bg: -1 } })
		s.withClip({ x: 3, y: 0, w: 2, h: 1 }, () => s.put(2, 0, '字', { fg: 2 }))
		expect(s.getCell(2, 0)).toEqual({ glyph: ' ', style: { fg: -1, bg: -1 } })
		expect(s.getCell(3, 0)).toEqual({ glyph: ' ', style: { fg: 2, bg: -1 } })
		s.withClip({ x: 3, y: 0, w: 2, h: 1 }, () => s.put(3, 0, '字'))
		expect(s.getCell(3, 0)!.wide).toBe(true)
	})

	it('colour setters address the whole pair from either half', () => {
		const s = make(4, 1)
		s.put(0, 0, '字')
		s.setBg(1, 0, 0x123456)
		s.setFg(1, 0, 0xabcdef)
		expect(s.getCell(0, 0)!.style).toEqual({ fg: 0xabcdef, bg: 0x123456 })
		expect(s.getCell(1, 0)!.style).toEqual({ fg: 0xabcdef, bg: 0x123456 })
		s.blendBg(1, 0, 0x000000, 1)
		expect(s.getCell(0, 0)!.style.bg).toBe(0)
		expect(s.getCell(1, 0)!.style.bg).toBe(0)
	})

	it('fillRect with a wide glyph keeps the glyph grid aligned and stops before an odd edge', () => {
		const s = make(6, 2)
		s.fillRect({ x: 0, y: 0, w: 5, h: 1 }, '字')
		expect(s.toText().split('\n')[0]).toBe('字字')
		expect(s.getCell(4, 0)!.glyph).toBe(' ')
		s.withClip({ x: 1, y: 1, w: 5, h: 1 }, () => s.fillRect({ x: 0, y: 1, w: 6, h: 1 }, '字'))
		expect(s.getCell(0, 1)!.glyph).toBe(' ')
		expect(s.getCell(1, 1)!.glyph).toBe(' ')
		expect(s.getCell(2, 1)!.wide).toBe(true)
		expect(s.getCell(4, 1)!.wide).toBe(true)
	})

	it('text advances two cells per wide grapheme and respects maxWidth', () => {
		const s = make(6, 1)
		expect(s.text(0, 0, 'a日b', undefined, 3)).toBe(3)
		expect(s.toText()).toBe('a日')
	})

	it('a line drawn over a wide glyph breaks the pair', () => {
		const s = make(4, 1)
		s.put(0, 0, '字')
		s.line(1, 0, LINE_E | LINE_W, LIGHT)
		expect(s.getCell(0, 0)!.glyph).toBe(' ')
		expect(s.getCell(1, 0)!.glyph).toBe('─')
	})
})

describe('Screen clipping', () => {
	it('ignores writes outside the clip and restores the clip afterwards', () => {
		const s = make(5, 5)
		s.withClip({ x: 1, y: 1, w: 2, h: 2 }, () => {
			s.put(0, 0, 'x')
			s.put(1, 1, 'a')
			s.put(2, 2, 'b')
			s.put(3, 3, 'x')
			s.text(0, 1, 'wxyz')
			s.fillRect({ x: 0, y: 2, w: 5, h: 5 }, '#')
			s.setBg(0, 0, 1)
			s.setFg(0, 0, 1)
			s.blendBg(0, 0, 1, 1)
			s.line(4, 4, LINE_N, LIGHT)
		})
		expect(s.toText()).toBe('\n xy\n ##\n\n')
		expect(s.getCell(0, 0)).toEqual({ glyph: ' ', style: { fg: -1, bg: -1 } })
		expect(s.getClip()).toEqual({ x: 0, y: 0, w: 5, h: 5 })
		s.put(4, 4, 'c')
		expect(s.getCell(4, 4)!.glyph).toBe('c')
	})

	it('nested clips intersect', () => {
		const s = make(6, 6)
		s.withClip({ x: 1, y: 1, w: 4, h: 4 }, () => {
			s.withClip({ x: 0, y: 0, w: 3, h: 3 }, () => {
				expect(s.getClip()).toEqual({ x: 1, y: 1, w: 2, h: 2 })
				s.fillRect({ x: 0, y: 0, w: 6, h: 6 }, '#')
			})
			expect(s.getClip()).toEqual({ x: 1, y: 1, w: 4, h: 4 })
			s.withClip({ x: 5, y: 5, w: 3, h: 3 }, () => {
				expect(s.getClip()).toEqual({ x: 5, y: 5, w: 0, h: 0 })
				s.put(5, 5, 'x')
			})
		})
		expect(s.toText()).toBe('\n ##\n ##\n\n\n')
	})

	it('restores the clip when the callback throws', () => {
		const s = make(3, 3)
		expect(() =>
			s.withClip({ x: 1, y: 1, w: 1, h: 1 }, () => {
				throw new Error('boom')
			})
		).toThrow('boom')
		expect(s.getClip()).toEqual({ x: 0, y: 0, w: 3, h: 3 })
	})
})

describe('Screen line layer', () => {
	it('ORs masks into junction glyphs', () => {
		const s = make(3, 3)
		s.line(1, 0, LINE_S, LIGHT)
		s.line(1, 1, LINE_N | LINE_S, LIGHT)
		s.line(1, 2, LINE_N, LIGHT)
		s.line(0, 1, LINE_E, LIGHT)
		s.line(1, 1, LINE_E | LINE_W, LIGHT)
		s.line(2, 1, LINE_W, LIGHT)
		expect(s.toText()).toBe(' ╷\n╶┼╴\n ╵')
	})

	it('draws a box with corners and tees', () => {
		const s = make(6, 4)
		box(s, { x: 0, y: 0, w: 4, h: 3 })
		expect(s.toText()).toBe('┌──┐\n│  │\n└──┘\n')
		s.line(3, 1, LINE_E, LIGHT)
		s.line(4, 1, LINE_E | LINE_W, LIGHT)
		s.line(5, 1, LINE_W, LIGHT)
		expect(s.toText().split('\n')[1]).toBe('│  ├─╴')
	})

	it('supports heavy and double weights; the last style wins per cell', () => {
		const s = make(3, 1)
		s.line(0, 0, LINE_E | LINE_W, { fg: 1, weight: 'heavy' })
		s.line(1, 0, LINE_E | LINE_W, { fg: 2, weight: 'double' })
		s.line(2, 0, LINE_E, { fg: 3, weight: 'light' })
		s.line(2, 0, LINE_W, { fg: 4, weight: 'heavy' })
		expect(s.toText()).toBe('━═━')
		expect(s.getCell(0, 0)!.style.fg).toBe(1)
		expect(s.getCell(2, 0)!.style.fg).toBe(4)
	})

	it('reads a reused style object by value, so mutating it between calls takes effect', () => {
		const s = make(3, 1)
		const style: LineStyle = { fg: 1, weight: 'light' }
		s.line(0, 0, LINE_E | LINE_W, style)
		style.fg = 2
		s.line(1, 0, LINE_E | LINE_W, style)
		style.weight = 'heavy'
		style.dash = 'dashed'
		s.line(2, 0, LINE_E | LINE_W, style)
		expect(s.toText()).toBe('──╍')
		expect(s.getCell(0, 0)!.style.fg).toBe(1)
		expect(s.getCell(1, 0)!.style.fg).toBe(2)
		expect(s.getCell(2, 0)!.style.fg).toBe(2)
	})

	it('dashes only pure horizontal or vertical runs; junctions stay solid', () => {
		const dashed: LineStyle = { fg: -1, weight: 'light', dash: 'dashed' }
		const dotted: LineStyle = { fg: -1, weight: 'light', dash: 'dotted' }
		const heavyDashed: LineStyle = { fg: -1, weight: 'heavy', dash: 'dashed' }
		const g = getGlyphs('rich')
		expect(lineGlyph(g, LINE_E | LINE_W, dashed)).toBe('╌')
		expect(lineGlyph(g, LINE_E, dashed)).toBe('╌')
		expect(lineGlyph(g, LINE_N | LINE_S, dashed)).toBe('╎')
		expect(lineGlyph(g, LINE_E | LINE_W, dotted)).toBe('┄')
		expect(lineGlyph(g, LINE_N | LINE_S, dotted)).toBe('┆')
		expect(lineGlyph(g, LINE_E | LINE_W, heavyDashed)).toBe('╍')
		expect(lineGlyph(g, LINE_N | LINE_S, heavyDashed)).toBe('╏')
		expect(lineGlyph(g, LINE_N | LINE_S | LINE_E, dashed)).toBe('├')
		expect(lineGlyph(g, LINE_E | LINE_S, dotted)).toBe('┌')
		expect(lineGlyph(g, 15, heavyDashed)).toBe('╋')
		const s = make(4, 1)
		s.line(0, 0, LINE_E, dashed)
		s.line(1, 0, LINE_E | LINE_W, dashed)
		s.line(2, 0, LINE_E | LINE_W | LINE_S, dashed)
		s.line(3, 0, LINE_W, dashed)
		expect(s.toText()).toBe('╌╌┬╌')
	})

	it('uses -|+ in the ascii tier', () => {
		const s = make(3, 3, { glyphs: 'ascii' })
		box(s, { x: 0, y: 0, w: 3, h: 3 })
		s.line(1, 1, 15, LIGHT)
		expect(s.toText()).toBe('+-+\n|+|\n+-+')
		s.line(1, 0, LINE_E | LINE_W, { fg: -1, weight: 'heavy' })
		expect(s.toText().split('\n')[0]).toBe('+=+')
	})

	it('put over a line cell replaces it, while a line over a glyph wins', () => {
		const s = make(3, 1)
		s.line(0, 0, LINE_E | LINE_W, LIGHT)
		s.put(0, 0, 'x')
		expect(s.getCell(0, 0)!.glyph).toBe('x')
		s.put(1, 0, 'y')
		s.line(1, 0, LINE_E | LINE_W, LIGHT)
		expect(s.getCell(1, 0)!.glyph).toBe('─')
		s.text(0, 0, 'ab')
		expect(s.toText()).toBe('ab')
		s.fillRect({ x: 0, y: 0, w: 3, h: 1 }, ' ')
		s.line(2, 0, LINE_N, LIGHT)
		s.fillRect({ x: 0, y: 0, w: 3, h: 1 }, ' ')
		expect(s.toText()).toBe('')
	})

	it('ignores empty masks and keeps line fg when a glyph is later recoloured', () => {
		const s = make(2, 1)
		s.line(0, 0, 0, { fg: 5, weight: 'light' })
		expect(s.getCell(0, 0)!.glyph).toBe(' ')
		s.line(1, 0, LINE_E | LINE_W, { fg: 5, weight: 'light' })
		s.setBg(1, 0, 7)
		expect(s.getCell(1, 0)).toEqual({ glyph: '─', style: { fg: 5, bg: 7 } })
	})

	it('resolveLines is idempotent and lines survive repeated resolution', () => {
		const s = make(2, 1)
		s.line(0, 0, LINE_E | LINE_W, LIGHT)
		s.resolveLines()
		s.resolveLines()
		expect(s.toText()).toBe('─')
		s.line(1, 0, LINE_W, LIGHT)
		expect(s.toText()).toBe('─╴')
	})
})

describe('Screen flush', () => {
	it('first flush is a full redraw from the home position with an SGR reset', () => {
		const s = make(4, 2)
		s.put(1, 0, 'a', { fg: 0xff0000 })
		const out = s.flush()
		expect(out).toBe(`${CUP(1, 1)}\x1b[0m \x1b[38;2;255;0;0ma\x1b[39m  ${CUP(2, 1)}    `)
		expect(s.flush()).toBe('')
	})

	it('wraps frames in synchronized output by default', () => {
		const s = new Screen(2, 1)
		const out = s.flush()
		expect(out.startsWith(SYNC_START)).toBe(true)
		expect(out.endsWith(SYNC_END)).toBe(true)
		expect(s.flush()).toBe('')
		s.put(0, 0, 'x')
		expect(s.flush()).toBe(`${SYNC_START}${CUP(1, 1)}x${SYNC_END}`)
	})

	it('emits only the changed cell after the first frame, in under 64 bytes', () => {
		const s = make(200, 50)
		s.flush()
		s.put(3, 1, 'b')
		const out = s.flush()
		expect(out).toBe(`${CUP(2, 4)}b`)
		expect(Buffer.byteLength(out)).toBeLessThan(64)
		s.put(100, 40, '字', { fg: 0x1e90ff, bg: 0x000000, bold: true })
		const wide = s.flush()
		expect(wide).toBe(`${CUP(41, 101)}\x1b[1;38;2;30;144;255;48;2;0;0;0m字`)
		expect(Buffer.byteLength(wide)).toBeLessThan(64)
	})

	it('positions the cursor only for non-adjacent cells and re-emits short gaps', () => {
		const s = make(12, 2)
		s.flush()
		s.put(0, 0, 'x')
		s.put(1, 0, 'y')
		s.put(4, 0, 'z')
		s.put(9, 0, 'w')
		s.put(0, 1, 'v')
		expect(s.flush()).toBe(`${CUP(1, 1)}xy  z${CUP(1, 10)}w${CUP(2, 1)}v`)
	})

	it('does not re-emit a gap whose cells differ from the current SGR state', () => {
		const s = make(6, 1)
		s.put(1, 0, ' ', { bg: 0xff0000 })
		s.flush()
		s.put(0, 0, 'a')
		s.put(2, 0, 'b')
		expect(s.flush()).toBe(`${CUP(1, 1)}a${CUP(1, 3)}b`)
	})

	it('tracks the cursor past a wide glyph and rewrites both halves of a broken pair', () => {
		const s = make(4, 1)
		s.put(0, 0, '字')
		s.put(2, 0, 'a')
		expect(s.flush()).toBe(`${CUP(1, 1)}\x1b[0m字a `)
		s.put(1, 0, 'b')
		expect(s.flush()).toBe(`${CUP(1, 1)} b`)
		s.put(0, 0, '字')
		expect(s.flush()).toBe(`${CUP(1, 1)}字`)
		s.put(2, 0, '本')
		expect(s.flush()).toBe(`${CUP(1, 3)}本`)
	})

	it('forces a CUP after writing the last column', () => {
		const s = make(3, 2)
		s.flush()
		s.put(2, 0, 'a')
		s.put(0, 1, 'b')
		expect(s.flush()).toBe(`${CUP(1, 3)}a${CUP(2, 1)}b`)
	})

	it('runs an SGR state machine: attributes and colours only when they change', () => {
		const s = make(6, 1)
		s.put(0, 0, 'a', { bold: true })
		s.put(1, 0, 'b', { bold: true })
		s.put(2, 0, 'c', { dim: true })
		s.put(3, 0, 'd', { bold: true, dim: true, underline: true })
		s.put(4, 0, 'e', { underline: true, italic: true, inverse: true })
		s.put(5, 0, 'f')
		expect(s.flush()).toBe(
			`${CUP(1, 1)}\x1b[0;1mab\x1b[22;2mc\x1b[1;4md\x1b[22;3;7me\x1b[23;24;27mf`
		)
		s.put(5, 0, 'g', { fg: 0x010203, bg: 0x040506 })
		expect(s.flush()).toBe(`${CUP(1, 6)}\x1b[38;2;1;2;3;48;2;4;5;6mg`)
		s.put(5, 0, 'h', { fg: -1 })
		expect(s.flush()).toBe(`${CUP(1, 6)}\x1b[39mh`)
	})

	it('keeps SGR state across frames so an unchanged style costs nothing', () => {
		const s = make(3, 1)
		s.put(0, 0, 'a', { fg: 0xff0000 })
		s.flush()
		s.put(1, 0, 'b', { fg: 0xff0000 })
		s.put(2, 0, 'c', { fg: 0xff0000 })
		// The frame ended on a default-coloured cell, so red is set once and then reused.
		expect(s.flush()).toBe(`${CUP(1, 2)}\x1b[38;2;255;0;0mbc`)
		s.put(0, 0, 'd', { fg: 0xff0000 })
		expect(s.flush()).toBe(`${CUP(1, 1)}d`)
	})

	it('encodes colours per mode', () => {
		const c24 = make(1, 1, { colorMode: '24bit' })
		c24.put(0, 0, 'a', { fg: 0x1e90ff, bg: 0x870000 })
		expect(c24.flush()).toBe(`${CUP(1, 1)}\x1b[0;38;2;30;144;255;48;2;135;0;0ma`)
		const c256 = make(1, 1, { colorMode: '256' })
		c256.put(0, 0, 'a', { fg: 0x1e90ff, bg: 0x870000 })
		expect(c256.flush()).toBe(`${CUP(1, 1)}\x1b[0;38;5;33;48;5;88ma`)
		const c16 = make(2, 1, { colorMode: '16' })
		c16.put(0, 0, 'a', { fg: 0xff0000, bg: 0x000000 })
		c16.put(1, 0, 'b', { fg: 0x0000ee, bg: 0xffffff })
		expect(c16.flush()).toBe(`${CUP(1, 1)}\x1b[0;91;40ma\x1b[34;107mb`)
	})

	it('never clears the screen with ED', () => {
		const s = make(20, 5)
		const outs = [s.flush()]
		s.fillRect({ x: 0, y: 0, w: 20, h: 5 }, '#')
		outs.push(s.flush())
		s.clear()
		outs.push(s.flush())
		s.setFullRedraw()
		outs.push(s.flush())
		s.resize(10, 2)
		outs.push(s.flush())
		for (const o of outs) expect(o.includes('\x1b[2J')).toBe(false)
	})

	it('setFullRedraw repaints everything and resets SGR knowledge', () => {
		const s = make(3, 1)
		s.put(0, 0, 'a', { fg: 0xff0000 })
		s.flush()
		expect(s.flush()).toBe('')
		s.setFullRedraw()
		expect(s.flush()).toBe(`${CUP(1, 1)}\x1b[0;38;2;255;0;0ma\x1b[39m  `)
	})

	it('resize clears both buffers and makes the next flush a full redraw', () => {
		const s = make(4, 2)
		s.text(0, 0, 'abcd')
		s.flush()
		s.resize(3, 3)
		expect(s.cols).toBe(3)
		expect(s.rows).toBe(3)
		expect(s.getCell(3, 0)).toBeUndefined()
		expect(s.toText()).toBe('\n\n')
		const out = s.flush()
		expect(out.startsWith(`${CUP(1, 1)}\x1b[0m`)).toBe(true)
		expect(stripAnsi(out)).toBe('         ')
		expect(s.getClip()).toEqual({ x: 0, y: 0, w: 3, h: 3 })
	})

	it('configure changes options and forces a full redraw', () => {
		const s = make(1, 1)
		s.put(0, 0, 'a', { fg: 0xff0000 })
		s.flush()
		s.configure({ colorMode: '256', glyphs: 'ascii', ambiguousWide: true, background: 0xffffff })
		expect(s.getOptions()).toEqual({
			colorMode: '256',
			glyphs: 'ascii',
			ambiguousWide: true,
			syncOutput: false,
			background: 0xffffff,
		})
		expect(s.getGlyphSet().tier).toBe('ascii')
		expect(s.flush()).toBe(`${CUP(1, 1)}\x1b[0;38;5;196ma`)
	})

	it('treats ambiguous-width glyphs as wide when configured', () => {
		const s = make(4, 1, { ambiguousWide: true })
		s.put(0, 0, '─')
		expect(s.getCell(0, 0)!.wide).toBe(true)
		expect(s.getCell(1, 0)!.glyph).toBe('')
		// Clipped cells still count towards the advance.
		expect(s.text(2, 0, '■■')).toBe(4)
		expect(s.getCell(2, 0)!.wide).toBe(true)
	})

	it('a full redraw of a busy 200x50 screen with a few styles stays under 64 KB', () => {
		const s = make(200, 50)
		const glyphs = ['─', '│', '┼', 'a', 'Z', ' ', '█', '░']
		const styles = [
			{ fg: 0xff0000 },
			{ fg: 0x00ff00, bg: 0x000000 },
			{ fg: -1 },
			{ fg: 0x1e90ff, bold: true },
		]
		let seed = 12345
		const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
		// Random glyphs everywhere, but styles in runs of 8 cells like real shapes and text.
		for (let y = 0; y < 50; y++) {
			let style = styles[0]
			for (let x = 0; x < 200; x++) {
				if (x % 8 === 0) style = styles[(rnd() * styles.length) | 0]
				s.put(x, y, glyphs[(rnd() * glyphs.length) | 0], style)
			}
		}
		const out = s.flush()
		expect(Buffer.byteLength(out)).toBeLessThan(64 * 1024)
		expect(s.flush()).toBe('')
	})

	it('replays into the same grid that toText describes', () => {
		const s = make(12, 4)
		box(s, { x: 0, y: 0, w: 6, h: 3 })
		s.text(1, 1, 'hi日', { fg: 0xff0000 })
		s.put(8, 2, '●', { bold: true })
		s.text(0, 3, 'status bar', { inverse: true })
		const first = s.flush()
		expect(ansiToGrid(first, 12, 4)).toEqual(s.toText().split('\n'))
		s.put(2, 1, 'o')
		s.put(9, 2, '●')
		const second = s.flush()
		expect(second.length).toBeLessThan(first.length / 2)
		const replay = ansiToGrid(first + second, 12, 4)
		expect(replay).toEqual(s.toText().split('\n'))
		expect(replay[1]).toBe('│ho日│')
		expect(replay[2]).toBe('└────┘  ●●')
	})
})
