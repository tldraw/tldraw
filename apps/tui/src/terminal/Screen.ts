import { getGlyphs, GlyphSet, GlyphTier } from './chars'
import { blend, blueOf, ColorMode, greenOf, quantize16, quantize256, redOf, Rgb } from './colors'
import { cellWidth, graphemes } from './width'

export type { Rgb } from './colors'

export interface CellStyle {
	fg: Rgb
	bg: Rgb
	bold?: boolean
	dim?: boolean
	italic?: boolean
	underline?: boolean
	inverse?: boolean
}

export interface Rect {
	x: number
	y: number
	w: number
	h: number
}

/** Bit 1 = N, 2 = E, 4 = S, 8 = W. */
export type LineMask = number

export const LINE_N = 1
export const LINE_E = 2
export const LINE_S = 4
export const LINE_W = 8

export interface LineStyle {
	fg: Rgb
	weight: 'light' | 'heavy' | 'double'
	dash?: 'solid' | 'dashed' | 'dotted'
}

export interface ScreenOptions {
	colorMode: ColorMode
	glyphs: GlyphTier
	ambiguousWide?: boolean
	syncOutput?: boolean
	/** What the terminal's default background looks like; `blendBg` blends over it. */
	background?: Rgb
}

export interface Cell {
	glyph: string
	style: CellStyle
	wide?: boolean
}

export const ATTR_BOLD = 1
export const ATTR_DIM = 2
export const ATTR_ITALIC = 4
export const ATTR_UNDERLINE = 8
export const ATTR_INVERSE = 16

const SPACE = 0x20
// Glyph values at or above this are indices into the side table of multi-code-point graphemes.
const SIDE_FLAG = 0x80000000
const WIDE_LEAD = 1
const WIDE_CONTINUATION = 2
const SYNC_START = '\x1b[?2026h'
const SYNC_END = '\x1b[?2026l'

const ASCII_CHARS: string[] = []
for (let i = 0; i < 128; i++) ASCII_CHARS.push(String.fromCharCode(i))

class CellBuffer {
	readonly glyph: Uint32Array
	readonly fg: Int32Array
	readonly bg: Int32Array
	readonly attrs: Uint8Array
	readonly wide: Uint8Array

	constructor(size: number) {
		this.glyph = new Uint32Array(size).fill(SPACE)
		this.fg = new Int32Array(size).fill(-1)
		this.bg = new Int32Array(size).fill(-1)
		this.attrs = new Uint8Array(size)
		this.wide = new Uint8Array(size)
	}

	copyFrom(other: CellBuffer) {
		this.glyph.set(other.glyph)
		this.fg.set(other.fg)
		this.bg.set(other.bg)
		this.attrs.set(other.attrs)
		this.wide.set(other.wide)
	}
}

function intersect(a: Rect, b: Rect): Rect {
	const x = Math.max(a.x, b.x)
	const y = Math.max(a.y, b.y)
	const r = Math.min(a.x + a.w, b.x + b.w)
	const btm = Math.min(a.y + a.h, b.y + b.h)
	return { x, y, w: Math.max(0, r - x), h: Math.max(0, btm - y) }
}

function isControlGlyph(g: string): boolean {
	if (g.length !== 1) return false
	const c = g.charCodeAt(0)
	return c < 0x20 || (c >= 0x7f && c < 0xa0)
}

/**
 * Double-buffered cell grid. Writes go to the back buffer; `flush()` diffs it against what the
 * terminal shows and returns the minimal ANSI to bring the terminal up to date.
 */
export class Screen {
	readonly cols: number
	readonly rows: number

	private back: CellBuffer
	private front: CellBuffer
	private lineMask: Uint8Array
	private lineStyleIdx: Uint16Array
	private lineCellCount = 0
	private linesDirty = false
	private readonly lineStyles: LineStyle[] = [{ fg: -1, weight: 'light' }]
	private readonly lineStyleKeys = new Map<string, number>()
	private lastLineStyle: LineStyle | null = null
	private lastLineStyleIdx = 0
	private sideTable: string[] = []
	private sideIndex = new Map<string, number>()
	private clipStack: Rect[] = []
	private clip: Rect
	private full = true

	private colorMode: ColorMode
	private glyphSet: GlyphSet
	private ambiguousWide: boolean
	private syncOutput: boolean
	private background: Rgb

	// SGR state the terminal is believed to be in; persists across flushes so unchanged styles
	// cost no bytes. Reset to unknown whenever a full redraw is requested.
	private sgrKnown = false
	private sgrFg = -1
	private sgrBg = -1
	private sgrAttrs = 0
	private fgParamCache = new Map<number, string>()
	private bgParamCache = new Map<number, string>()

	constructor(cols: number, rows: number, opts?: Partial<ScreenOptions>) {
		this.cols = Math.max(1, cols | 0)
		this.rows = Math.max(1, rows | 0)
		this.colorMode = opts?.colorMode ?? '24bit'
		this.glyphSet = getGlyphs(opts?.glyphs ?? 'rich')
		this.ambiguousWide = opts?.ambiguousWide ?? false
		this.syncOutput = opts?.syncOutput ?? true
		this.background = opts?.background ?? 0x000000
		const size = this.cols * this.rows
		this.back = new CellBuffer(size)
		this.front = new CellBuffer(size)
		this.lineMask = new Uint8Array(size)
		this.lineStyleIdx = new Uint16Array(size)
		this.clip = { x: 0, y: 0, w: this.cols, h: this.rows }
	}

	getOptions(): ScreenOptions {
		return {
			colorMode: this.colorMode,
			glyphs: this.glyphSet.tier,
			ambiguousWide: this.ambiguousWide,
			syncOutput: this.syncOutput,
			background: this.background,
		}
	}

	/** Changes options after construction (probe results arrive late); forces a full redraw. */
	configure(opts: Partial<ScreenOptions>): void {
		if (opts.colorMode !== undefined) {
			this.colorMode = opts.colorMode
			this.fgParamCache.clear()
			this.bgParamCache.clear()
		}
		if (opts.glyphs !== undefined) this.glyphSet = getGlyphs(opts.glyphs)
		if (opts.ambiguousWide !== undefined) this.ambiguousWide = opts.ambiguousWide
		if (opts.syncOutput !== undefined) this.syncOutput = opts.syncOutput
		if (opts.background !== undefined) this.background = opts.background
		this.setFullRedraw()
	}

	getGlyphSet(): GlyphSet {
		return this.glyphSet
	}

	getClip(): Rect {
		return this.clip
	}

	resize(cols: number, rows: number): void {
		;(this as { cols: number }).cols = Math.max(1, cols | 0)
		;(this as { rows: number }).rows = Math.max(1, rows | 0)
		const size = this.cols * this.rows
		this.back = new CellBuffer(size)
		this.front = new CellBuffer(size)
		this.lineMask = new Uint8Array(size)
		this.lineStyleIdx = new Uint16Array(size)
		this.lineCellCount = 0
		this.linesDirty = false
		this.sideTable = []
		this.sideIndex = new Map()
		this.clipStack = []
		this.clip = { x: 0, y: 0, w: this.cols, h: this.rows }
		this.setFullRedraw()
	}

	setFullRedraw(): void {
		this.full = true
		this.sgrKnown = false
	}

	clear(style?: Partial<CellStyle>): void {
		const b = this.back
		b.glyph.fill(SPACE)
		b.fg.fill(style?.fg ?? -1)
		b.bg.fill(style?.bg ?? -1)
		b.attrs.fill(style ? attrsFromStyle(0, style) : 0)
		b.wide.fill(0)
		if (this.lineCellCount > 0) {
			this.lineMask.fill(0)
			this.lineStyleIdx.fill(0)
			this.lineCellCount = 0
		}
		this.linesDirty = false
	}

	private inClip(col: number, row: number): boolean {
		const c = this.clip
		return col >= c.x && col < c.x + c.w && row >= c.y && row < c.y + c.h
	}

	private encodeGlyph(g: string): number {
		const len = g.length
		if (len === 1) {
			const c = g.charCodeAt(0)
			return c === 0x2800 ? SPACE : c
		}
		const cp = g.codePointAt(0)!
		if (len === 2 && cp > 0xffff) return cp
		let idx = this.sideIndex.get(g)
		if (idx === undefined) {
			idx = this.sideTable.length
			this.sideTable.push(g)
			this.sideIndex.set(g, idx)
		}
		return SIDE_FLAG + idx
	}

	private decodeGlyph(v: number): string {
		if (v < 128) return ASCII_CHARS[v]
		if (v >= SIDE_FLAG) return this.sideTable[v - SIDE_FLAG] ?? ' '
		return String.fromCodePoint(v)
	}

	/** Turns the wide pair that `i` belongs to (if any) back into two narrow cells. */
	private breakWide(i: number): void {
		const b = this.back
		const w = b.wide[i]
		if (w === WIDE_LEAD) {
			const j = i + 1
			if (j < b.wide.length) {
				b.glyph[j] = SPACE
				b.wide[j] = 0
			}
			b.wide[i] = 0
		} else if (w === WIDE_CONTINUATION) {
			const k = i - 1
			if (k >= 0) {
				b.glyph[k] = SPACE
				b.wide[k] = 0
			}
			b.wide[i] = 0
		}
	}

	private applyStyle(i: number, style: Partial<CellStyle> | undefined): void {
		if (!style) return
		const b = this.back
		if (style.fg !== undefined) b.fg[i] = style.fg
		if (style.bg !== undefined) b.bg[i] = style.bg
		b.attrs[i] = attrsFromStyle(b.attrs[i], style)
	}

	private writeNarrow(col: number, row: number, glyph: string, style?: Partial<CellStyle>): void {
		const i = row * this.cols + col
		this.breakWide(i)
		this.back.glyph[i] = this.encodeGlyph(glyph)
		if (this.lineMask[i] !== 0) this.clearLineCell(i)
		this.applyStyle(i, style)
	}

	private writeWide(col: number, row: number, glyph: string, style?: Partial<CellStyle>): void {
		const i = row * this.cols + col
		const j = i + 1
		this.breakWide(i)
		this.breakWide(j)
		const b = this.back
		b.glyph[i] = this.encodeGlyph(glyph)
		b.glyph[j] = SPACE
		b.wide[i] = WIDE_LEAD
		b.wide[j] = WIDE_CONTINUATION
		if (this.lineMask[i] !== 0) this.clearLineCell(i)
		if (this.lineMask[j] !== 0) this.clearLineCell(j)
		this.applyStyle(i, style)
		this.applyStyle(j, style)
	}

	private clearLineCell(i: number): void {
		this.lineMask[i] = 0
		this.lineStyleIdx[i] = 0
		this.lineCellCount--
	}

	private putMeasured(
		col: number,
		row: number,
		glyph: string,
		width: number,
		style: Partial<CellStyle> | undefined
	): void {
		if (width === 2) {
			const leadIn = this.inClip(col, row)
			const tailIn = col + 1 < this.cols && this.inClip(col + 1, row)
			// A wide glyph straddling a clip edge or the last column cannot be drawn whole.
			if (leadIn && tailIn) this.writeWide(col, row, glyph, style)
			else if (leadIn) this.writeNarrow(col, row, ' ', style)
			else if (tailIn) this.writeNarrow(col + 1, row, ' ', style)
			return
		}
		if (!this.inClip(col, row)) return
		this.writeNarrow(col, row, glyph, style)
	}

	/** Writes one grapheme (width 1 or 2). Out-of-clip cells are ignored; controls become `?`. */
	put(col: number, row: number, glyph: string, style?: Partial<CellStyle>): void {
		if (glyph.length === 0) return
		let w: number = cellWidth(glyph, this.ambiguousWide)
		if (w === 0) {
			if (!isControlGlyph(glyph)) return
			glyph = '?'
			w = 1
		}
		this.putMeasured(col | 0, row | 0, glyph, w, style)
	}

	/** Writes a string grapheme by grapheme; returns the cells used (clipped cells still count). */
	text(col: number, row: number, s: string, style?: Partial<CellStyle>, maxWidth?: number): number {
		const limit = maxWidth ?? Infinity
		let used = 0
		col |= 0
		row |= 0
		for (const g of graphemes(s)) {
			let glyph = g
			let w: number = cellWidth(g, this.ambiguousWide)
			if (w === 0) {
				if (!isControlGlyph(g)) continue
				glyph = '?'
				w = 1
			}
			if (used + w > limit) break
			this.putMeasured(col + used, row, glyph, w, style)
			used += w
		}
		return used
	}

	fillRect(rect: Rect, glyph: string, style?: Partial<CellStyle>): void {
		if (glyph.length === 0) return
		let w: number = cellWidth(glyph, this.ambiguousWide)
		if (w === 0) {
			if (!isControlGlyph(glyph)) return
			glyph = '?'
			w = 1
		}
		const r = intersect(this.clip, rect)
		if (r.w <= 0 || r.h <= 0) return
		const right = r.x + r.w
		const rectRight = rect.x + rect.w
		// Start on the rect's own glyph grid so a clipped wide fill keeps its column parity.
		const start = rect.x + Math.floor((r.x - rect.x) / w) * w
		for (let y = r.y; y < r.y + r.h; y++) {
			for (let x = start; x < right && x + w <= rectRight; x += w) {
				this.putMeasured(x, y, glyph, w, style)
			}
		}
	}

	setBg(col: number, row: number, bg: Rgb): void {
		if (!this.inClip(col, row)) return
		const b = this.back
		let i = row * this.cols + col
		if (b.wide[i] === WIDE_CONTINUATION) i--
		b.bg[i] = bg
		if (b.wide[i] === WIDE_LEAD) b.bg[i + 1] = bg
	}

	setFg(col: number, row: number, fg: Rgb): void {
		if (!this.inClip(col, row)) return
		const b = this.back
		let i = row * this.cols + col
		if (b.wide[i] === WIDE_CONTINUATION) i--
		b.fg[i] = fg
		if (b.wide[i] === WIDE_LEAD) b.fg[i + 1] = fg
	}

	/** Alpha-blends `rgb` over the cell's background (the terminal default counts as `background`). */
	blendBg(col: number, row: number, rgb: Rgb, alpha: number): void {
		if (!this.inClip(col, row)) return
		const b = this.back
		let i = row * this.cols + col
		if (b.wide[i] === WIDE_CONTINUATION) i--
		const base = b.bg[i] === -1 ? this.background : b.bg[i]
		const v = blend(rgb, base, alpha)
		b.bg[i] = v
		if (b.wide[i] === WIDE_LEAD) b.bg[i + 1] = v
	}

	private internLineStyle(style: LineStyle): number {
		// Rasterizers pass one style for every cell of a shape; skip the key build when it still
		// matches the last interned entry (compared by value, since callers may mutate the object).
		const dash = style.dash ?? 'solid'
		if (style === this.lastLineStyle) {
			const last = this.lineStyles[this.lastLineStyleIdx]
			if (last.fg === style.fg && last.weight === style.weight && last.dash === dash) {
				return this.lastLineStyleIdx
			}
		}
		const key = `${style.fg}|${style.weight}|${dash}`
		let idx = this.lineStyleKeys.get(key)
		if (idx === undefined) {
			idx = this.lineStyles.length
			this.lineStyles.push({ fg: style.fg, weight: style.weight, dash })
			this.lineStyleKeys.set(key, idx)
		}
		this.lastLineStyle = style
		this.lastLineStyleIdx = idx
		return idx
	}

	/** ORs `mask` into the cell's line layer; the glyph is chosen at flush. Last style wins. */
	line(col: number, row: number, mask: LineMask, style: LineStyle): void {
		if ((mask & 15) === 0 || !this.inClip(col, row)) return
		const i = row * this.cols + col
		this.breakWide(i)
		if (this.lineMask[i] === 0) this.lineCellCount++
		this.lineMask[i] |= mask & 15
		this.lineStyleIdx[i] = this.internLineStyle(style)
		this.linesDirty = true
	}

	resolveLines(): void {
		if (!this.linesDirty) return
		this.linesDirty = false
		if (this.lineCellCount === 0) return
		const g = this.glyphSet
		const b = this.back
		const masks = this.lineMask
		const n = masks.length
		for (let i = 0; i < n; i++) {
			const mask = masks[i]
			if (mask === 0) continue
			const st = this.lineStyles[this.lineStyleIdx[i]]
			b.glyph[i] = this.encodeGlyph(lineGlyph(g, mask, st))
			b.fg[i] = st.fg
			b.wide[i] = 0
		}
	}

	withClip(rect: Rect, fn: () => void): void {
		this.clipStack.push(this.clip)
		this.clip = intersect(this.clip, rect)
		try {
			fn()
		} finally {
			this.clip = this.clipStack.pop()!
		}
	}

	getCell(col: number, row: number): Cell | undefined {
		if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return undefined
		this.resolveLines()
		const b = this.back
		const i = row * this.cols + col
		const style: CellStyle = { fg: b.fg[i], bg: b.bg[i] }
		const a = b.attrs[i]
		if (a & ATTR_BOLD) style.bold = true
		if (a & ATTR_DIM) style.dim = true
		if (a & ATTR_ITALIC) style.italic = true
		if (a & ATTR_UNDERLINE) style.underline = true
		if (a & ATTR_INVERSE) style.inverse = true
		const w = b.wide[i]
		if (w === WIDE_CONTINUATION) return { glyph: '', style }
		const cell: Cell = { glyph: this.decodeGlyph(b.glyph[i]), style }
		if (w === WIDE_LEAD) cell.wide = true
		return cell
	}

	private fgParam(fg: Rgb): string {
		if (fg === -1) return '39'
		let s = this.fgParamCache.get(fg)
		if (s === undefined) {
			s = this.colorParam(fg, false)
			if (this.fgParamCache.size > 4096) this.fgParamCache.clear()
			this.fgParamCache.set(fg, s)
		}
		return s
	}

	private bgParam(bg: Rgb): string {
		if (bg === -1) return '49'
		let s = this.bgParamCache.get(bg)
		if (s === undefined) {
			s = this.colorParam(bg, true)
			if (this.bgParamCache.size > 4096) this.bgParamCache.clear()
			this.bgParamCache.set(bg, s)
		}
		return s
	}

	private colorParam(rgb: Rgb, isBg: boolean): string {
		switch (this.colorMode) {
			case '24bit':
				return `${isBg ? 48 : 38};2;${redOf(rgb)};${greenOf(rgb)};${blueOf(rgb)}`
			case '256':
				return `${isBg ? 48 : 38};5;${quantize256(rgb)}`
			case '16': {
				const n = quantize16(rgb)
				const base = n < 8 ? (isBg ? 40 : 30) + n : (isBg ? 100 : 90) + n - 8
				return String(base)
			}
		}
	}

	private emitSgr(out: string[], fg: Rgb, bg: Rgb, attrs: number): void {
		if (!this.sgrKnown) {
			const params = ['0']
			pushAttrOn(params, attrs)
			if (fg !== -1) params.push(this.fgParam(fg))
			if (bg !== -1) params.push(this.bgParam(bg))
			out.push(`\x1b[${params.join(';')}m`)
			this.sgrKnown = true
		} else {
			if (fg === this.sgrFg && bg === this.sgrBg && attrs === this.sgrAttrs) return
			const params: string[] = []
			if (attrs !== this.sgrAttrs) pushAttrDelta(params, this.sgrAttrs, attrs)
			if (fg !== this.sgrFg) params.push(this.fgParam(fg))
			if (bg !== this.sgrBg) params.push(this.bgParam(bg))
			out.push(`\x1b[${params.join(';')}m`)
		}
		this.sgrFg = fg
		this.sgrBg = bg
		this.sgrAttrs = attrs
	}

	private emitCell(out: string[], i: number): void {
		const b = this.back
		this.emitSgr(out, b.fg[i], b.bg[i], b.attrs[i])
		out.push(this.decodeGlyph(b.glyph[i]))
	}

	/**
	 * Diffs the back buffer against the terminal and returns the ANSI needed to update it ('' when
	 * nothing changed). The cursor is positioned with CUP only when the next changed cell is not
	 * adjacent; gaps of up to 3 same-style cells are re-emitted instead because that is cheaper.
	 */
	flush(): string {
		this.resolveLines()
		const back = this.back
		const front = this.front
		const cols = this.cols
		const n = cols * this.rows
		const full = this.full
		const out: string[] = []
		let cursorRow = -1
		let cursorCol = -1

		for (let i = 0; i < n; i++) {
			const w = back.wide[i]
			if (w === WIDE_CONTINUATION) continue
			if (
				!full &&
				back.glyph[i] === front.glyph[i] &&
				back.fg[i] === front.fg[i] &&
				back.bg[i] === front.bg[i] &&
				back.attrs[i] === front.attrs[i] &&
				w === front.wide[i]
			) {
				continue
			}
			const row = (i / cols) | 0
			const col = i - row * cols
			if (cursorRow !== row || cursorCol !== col) {
				const gap = cursorRow === row ? col - cursorCol : -1
				if (gap > 0 && gap <= 3 && this.canReemit(i - gap, i)) {
					for (let k = i - gap; k < i; k++) this.emitCell(out, k)
				} else {
					out.push(`\x1b[${row + 1};${col + 1}H`)
				}
				cursorRow = row
				cursorCol = col
			}
			this.emitCell(out, i)
			cursorCol += w === WIDE_LEAD ? 2 : 1
			// Past the last column the cursor position depends on autowrap; force a CUP next time.
			if (cursorCol >= cols) cursorRow = -1
		}

		if (out.length === 0) {
			this.full = false
			return ''
		}
		front.copyFrom(back)
		this.full = false
		if (this.syncOutput) {
			out.unshift(SYNC_START)
			out.push(SYNC_END)
		}
		return out.join('')
	}

	/** Gap cells can be re-emitted when they are narrow and already in the current SGR state. */
	private canReemit(from: number, to: number): boolean {
		const b = this.back
		if (!this.sgrKnown) return false
		for (let k = from; k < to; k++) {
			if (b.wide[k] !== 0) return false
			if (b.fg[k] !== this.sgrFg || b.bg[k] !== this.sgrBg || b.attrs[k] !== this.sgrAttrs)
				return false
		}
		return true
	}

	/** Plain-text dump of the back buffer with trailing spaces trimmed per row. */
	toText(): string {
		this.resolveLines()
		const b = this.back
		const lines: string[] = []
		for (let row = 0; row < this.rows; row++) {
			let s = ''
			const base = row * this.cols
			for (let col = 0; col < this.cols; col++) {
				const i = base + col
				if (b.wide[i] === WIDE_CONTINUATION) continue
				s += this.decodeGlyph(b.glyph[i])
			}
			let end = s.length
			while (end > 0 && s.charCodeAt(end - 1) === SPACE) end--
			lines.push(end === s.length ? s : s.slice(0, end))
		}
		return lines.join('\n')
	}
}

function attrsFromStyle(current: number, style: Partial<CellStyle>): number {
	let a = current
	if (style.bold !== undefined) a = style.bold ? a | ATTR_BOLD : a & ~ATTR_BOLD
	if (style.dim !== undefined) a = style.dim ? a | ATTR_DIM : a & ~ATTR_DIM
	if (style.italic !== undefined) a = style.italic ? a | ATTR_ITALIC : a & ~ATTR_ITALIC
	if (style.underline !== undefined) a = style.underline ? a | ATTR_UNDERLINE : a & ~ATTR_UNDERLINE
	if (style.inverse !== undefined) a = style.inverse ? a | ATTR_INVERSE : a & ~ATTR_INVERSE
	return a
}

function pushAttrOn(params: string[], attrs: number): void {
	if (attrs & ATTR_BOLD) params.push('1')
	if (attrs & ATTR_DIM) params.push('2')
	if (attrs & ATTR_ITALIC) params.push('3')
	if (attrs & ATTR_UNDERLINE) params.push('4')
	if (attrs & ATTR_INVERSE) params.push('7')
}

function pushAttrDelta(params: string[], from: number, to: number): void {
	const off = from & ~to
	const on = to & ~from
	// SGR 22 clears bold and dim together, so whichever of the two survives is re-applied.
	if (off & (ATTR_BOLD | ATTR_DIM)) {
		params.push('22')
		if (to & ATTR_BOLD) params.push('1')
		if (to & ATTR_DIM) params.push('2')
	} else {
		if (on & ATTR_BOLD) params.push('1')
		if (on & ATTR_DIM) params.push('2')
	}
	if (off & ATTR_ITALIC) params.push('23')
	else if (on & ATTR_ITALIC) params.push('3')
	if (off & ATTR_UNDERLINE) params.push('24')
	else if (on & ATTR_UNDERLINE) params.push('4')
	if (off & ATTR_INVERSE) params.push('27')
	else if (on & ATTR_INVERSE) params.push('7')
}

const HORIZONTAL_MASKS = (1 << LINE_E) | (1 << LINE_W) | (1 << (LINE_E | LINE_W))
const VERTICAL_MASKS = (1 << LINE_N) | (1 << LINE_S) | (1 << (LINE_N | LINE_S))

/** Dashes apply only to pure horizontal or vertical runs; junctions are always solid. */
export function lineGlyph(g: GlyphSet, mask: LineMask, style: LineStyle): string {
	const m = mask & 15
	const dash = style.dash ?? 'solid'
	if (dash !== 'solid') {
		const bit = 1 << m
		const heavy = style.weight === 'heavy'
		if (HORIZONTAL_MASKS & bit) {
			if (dash === 'dashed') return heavy ? g.dashedHeavyH : g.dashedH
			return heavy ? g.dottedHeavyH : g.dottedH
		}
		if (VERTICAL_MASKS & bit) {
			if (dash === 'dashed') return heavy ? g.dashedHeavyV : g.dashedV
			return heavy ? g.dottedHeavyV : g.dottedV
		}
	}
	switch (style.weight) {
		case 'heavy':
			return g.boxHeavy[m]
		case 'double':
			return g.boxDouble[m]
		default:
			return g.boxLight[m]
	}
}
