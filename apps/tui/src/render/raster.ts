import { CELL_H, CELL_W } from '../editor/constants'
import { GlyphSet, brailleGlyph, quadrantGlyph } from '../terminal/chars'
import {
	CellStyle,
	LINE_E,
	LINE_N,
	LINE_S,
	LINE_W,
	LineStyle,
	Rect,
	Screen,
} from '../terminal/Screen'

/**
 * Pure rasterizers shared by the shape renderer and the canvas emulation. Coordinates are cell
 * space floats: cell (c, r) covers [c, c + 1) × [r, r + 1), so a line at x lies in column floor(x).
 */

export type StrokeMode = 'braille' | 'blocks' | 'ascii'

export type FillRule = 'nonzero' | 'evenodd'

/** Called for every cell a polygon fill covers. */
export interface FillSink {
	fillCell(col: number, row: number): void
}

/** Extra per-cell visibility test (path clips); the Screen's own rectangular clip still applies. */
export type CellTest = (col: number, row: number) => boolean

/** A flat polyline `[x0, y0, x1, y1, …]`; only the first `count` points are meaningful. */
export interface Poly {
	points: ArrayLike<number>
	count: number
}

// A segment is drawn through the box-drawing line layer when it drifts less than this many cells
// off its axis over its whole length AND its angle (in screen px, where a cell is 8 × 16) is within
// about 15° of the axis; the angle test keeps finely flattened curves from reading as axis runs.
const AXIS_EPSILON = 0.35
const AXIS_SLOPE_MAX = 0.268

const SEG_SUBCELL = 0
const SEG_HORIZONTAL = 1
const SEG_VERTICAL = 2
const SEG_TINY = 3

function classifySegment(dx: number, dy: number): number {
	if (dx < AXIS_EPSILON && dy < AXIS_EPSILON) return SEG_TINY
	if (dy < AXIS_EPSILON && dy * CELL_H <= dx * CELL_W * AXIS_SLOPE_MAX) return SEG_HORIZONTAL
	if (dx < AXIS_EPSILON && dx * CELL_W <= dy * CELL_H * AXIS_SLOPE_MAX) return SEG_VERTICAL
	return SEG_SUBCELL
}

const ASCII_H = 1
const ASCII_V = 2
const ASCII_DOWN = 3 // '\'
const ASCII_UP = 4 // '/'
const ASCII_CROSS = 5

/**
 * A bit per cell. Shape text is recorded here so overlay strokes (selection indicators) never
 * replace a label glyph through the line layer, which otherwise wins at resolve time.
 */
export class CellMask {
	private bits: Uint8Array
	private touched: Int32Array
	private count = 0
	cols: number
	rows: number

	constructor(cols: number, rows: number) {
		this.cols = cols
		this.rows = rows
		this.bits = new Uint8Array(cols * rows)
		this.touched = new Int32Array(Math.max(64, (cols * rows) >> 3))
	}

	resize(cols: number, rows: number): void {
		if (cols === this.cols && rows === this.rows) return
		this.cols = cols
		this.rows = rows
		this.bits = new Uint8Array(cols * rows)
		this.touched = new Int32Array(Math.max(64, (cols * rows) >> 3))
		this.count = 0
	}

	clear(): void {
		const bits = this.bits
		const touched = this.touched
		for (let i = 0; i < this.count; i++) bits[touched[i]] = 0
		this.count = 0
	}

	set(col: number, row: number): void {
		if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return
		const i = row * this.cols + col
		if (this.bits[i]) return
		this.bits[i] = 1
		if (this.count === this.touched.length) {
			const grown = new Int32Array(this.touched.length * 2)
			grown.set(this.touched)
			this.touched = grown
		}
		this.touched[this.count++] = i
	}

	has(col: number, row: number): boolean {
		if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false
		return this.bits[row * this.cols + col] === 1
	}
}

const textMasks = new WeakMap<Screen, CellMask>()

/** The text-protection mask of a screen, sized to it. */
export function getTextMask(screen: Screen): CellMask {
	let mask = textMasks.get(screen)
	if (!mask) {
		mask = new CellMask(screen.cols, screen.rows)
		textMasks.set(screen, mask)
	} else {
		mask.resize(screen.cols, screen.rows)
	}
	return mask
}

/**
 * Accumulates sub-cell dots (braille 2×4, blocks 2×2, or one ascii glyph per cell) for one
 * stroke colour, then writes the resulting glyphs. Buffers are reused across flushes.
 */
export class SubCellRaster {
	readonly mode: StrokeMode
	private readonly glyphs: GlyphSet
	private readonly subW: number
	private readonly subH: number
	private bits = new Uint8Array(0)
	private touched = new Int32Array(256)
	private count = 0
	private cols = 0
	private rows = 0

	constructor(mode: StrokeMode, glyphs: GlyphSet) {
		this.mode = mode
		this.glyphs = glyphs
		this.subW = mode === 'ascii' ? 1 : 2
		this.subH = mode === 'braille' ? 4 : mode === 'blocks' ? 2 : 1
	}

	resize(cols: number, rows: number): void {
		if (cols === this.cols && rows === this.rows) return
		this.cols = cols
		this.rows = rows
		this.bits = new Uint8Array(cols * rows)
		this.count = 0
	}

	isEmpty(): boolean {
		return this.count === 0
	}

	private touch(i: number, value: number): void {
		const bits = this.bits
		if (bits[i] === 0) {
			if (this.count === this.touched.length) {
				const grown = new Int32Array(this.touched.length * 2)
				grown.set(this.touched)
				this.touched = grown
			}
			this.touched[this.count++] = i
			bits[i] = value
		} else if (this.mode === 'ascii') {
			if (bits[i] !== value) bits[i] = ASCII_CROSS
		} else {
			bits[i] |= value
		}
	}

	private plotSub(sx: number, sy: number, asciiCode: number): void {
		const col = this.mode === 'ascii' ? sx : sx >> 1
		const row = this.mode === 'braille' ? sy >> 2 : this.mode === 'blocks' ? sy >> 1 : sy
		if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return
		const i = row * this.cols + col
		if (this.mode === 'ascii') {
			this.touch(i, asciiCode)
			return
		}
		const dx = sx & 1
		if (this.mode === 'braille') {
			const dy = sy & 3
			// Unicode braille order: dots 1-3 left column, 4-6 right column, 7 and 8 the bottom row.
			const bit = dy < 3 ? (dx === 0 ? dy : 3 + dy) : dx === 0 ? 6 : 7
			this.touch(i, 1 << bit)
		} else {
			this.touch(i, 1 << ((sy & 1) * 2 + dx))
		}
	}

	/**
	 * Rasterizes a segment given in cell-space floats. `dash` 0 solid, 1 dashed, 2 dotted;
	 * `heavy` doubles the dot trail. Segments are clipped to the raster before stepping so a
	 * mostly off-screen line costs only its visible part.
	 */
	line(x0: number, y0: number, x1: number, y1: number, heavy = false, dash = 0): void {
		// Liang–Barsky against the raster, padded by one cell so edge dots still land.
		let t0 = 0
		let t1 = 1
		const dx = x1 - x0
		const dy = y1 - y0
		const minX = -1
		const minY = -1
		const maxX = this.cols + 1
		const maxY = this.rows + 1
		const edges = [-dx, dx, -dy, dy]
		const dists = [x0 - minX, maxX - x0, y0 - minY, maxY - y0]
		for (let k = 0; k < 4; k++) {
			const p = edges[k]
			const q = dists[k]
			if (p === 0) {
				if (q < 0) return
				continue
			}
			const t = q / p
			if (p < 0) {
				if (t > t1) return
				if (t > t0) t0 = t
			} else {
				if (t < t0) return
				if (t < t1) t1 = t
			}
		}
		const cx0 = x0 + dx * t0
		const cy0 = y0 + dy * t0
		const cx1 = x0 + dx * t1
		const cy1 = y0 + dy * t1

		const subW = this.subW
		const subH = this.subH
		let sx0 = Math.floor(cx0 * subW)
		let sy0 = Math.floor(cy0 * subH)
		const sx1 = Math.floor(cx1 * subW)
		const sy1 = Math.floor(cy1 * subH)

		let asciiCode = ASCII_H
		if (this.mode === 'ascii') {
			const adx = Math.abs(dx)
			const ady = Math.abs(dy) * 2 // a cell is twice as tall as it is wide
			if (adx > ady * 2) asciiCode = ASCII_H
			else if (ady > adx * 2) asciiCode = ASCII_V
			else asciiCode = dx * dy > 0 ? ASCII_DOWN : ASCII_UP
		}

		const adx = Math.abs(sx1 - sx0)
		const ady = Math.abs(sy1 - sy0)
		const stepX = sx0 < sx1 ? 1 : -1
		const stepY = sy0 < sy1 ? 1 : -1
		const steep = ady > adx
		let err = adx - ady
		let n = 0
		// Bresenham over sub-cells; the loop is bounded by the clipped segment length.
		for (;;) {
			const on = dash === 0 ? true : dash === 1 ? n % 6 < 3 : (n & 1) === 0
			if (on) {
				this.plotSub(sx0, sy0, asciiCode)
				if (heavy) {
					if (steep) this.plotSub(sx0 + 1, sy0, asciiCode)
					else this.plotSub(sx0, sy0 + 1, asciiCode)
				}
			}
			if (sx0 === sx1 && sy0 === sy1) break
			n++
			const e2 = err * 2
			if (e2 > -ady) {
				err -= ady
				sx0 += stepX
			}
			if (e2 < adx) {
				err += adx
				sy0 += stepY
			}
		}
	}

	/** Writes the accumulated glyphs in `style` and clears the buffer. */
	flush(screen: Screen, style: Partial<CellStyle>, visible: CellTest | null = null): void {
		const bits = this.bits
		const touched = this.touched
		const cols = this.cols
		const g = this.glyphs
		for (let k = 0; k < this.count; k++) {
			const i = touched[k]
			const value = bits[i]
			bits[i] = 0
			if (value === 0) continue
			const row = (i / cols) | 0
			const col = i - row * cols
			if (visible && !visible(col, row)) continue
			let glyph: string
			switch (this.mode) {
				case 'braille':
					glyph = brailleGlyph(g, value)
					break
				case 'blocks':
					glyph = quadrantGlyph(g, value)
					break
				default:
					glyph =
						value === ASCII_H
							? '-'
							: value === ASCII_V
								? '|'
								: value === ASCII_DOWN
									? g.diagonalDown
									: value === ASCII_UP
										? g.diagonalUp
										: '+'
			}
			if (glyph !== ' ') screen.put(col, row, glyph, style)
		}
		this.count = 0
	}
}

/**
 * Draws an axis-aligned run of box-drawing cells from (c0, r0) to (c1, r1) with connecting
 * masks: the first cell opens toward the second, interior cells are through lines, and the
 * last cell opens back, so runs that share an end cell form corners and junctions.
 */
export function drawLineRun(
	screen: Screen,
	c0: number,
	r0: number,
	c1: number,
	r1: number,
	horizontal: boolean,
	style: LineStyle,
	visible: CellTest | null = null
): void {
	if (horizontal) {
		if (c0 === c1) {
			if (!visible || visible(c0, r0)) screen.line(c0, r0, LINE_E | LINE_W, style)
			return
		}
		const step = c1 > c0 ? 1 : -1
		const toNext = step > 0 ? LINE_E : LINE_W
		const toPrev = step > 0 ? LINE_W : LINE_E
		for (let c = c0; ; c += step) {
			const mask = c === c0 ? toNext : c === c1 ? toPrev : LINE_E | LINE_W
			if (!visible || visible(c, r0)) screen.line(c, r0, mask, style)
			if (c === c1) break
		}
	} else {
		if (r0 === r1) {
			if (!visible || visible(c0, r0)) screen.line(c0, r0, LINE_N | LINE_S, style)
			return
		}
		const step = r1 > r0 ? 1 : -1
		const toNext = step > 0 ? LINE_S : LINE_N
		const toPrev = step > 0 ? LINE_N : LINE_S
		for (let r = r0; ; r += step) {
			const mask = r === r0 ? toNext : r === r1 ? toPrev : LINE_N | LINE_S
			if (!visible || visible(c0, r)) screen.line(c0, r, mask, style)
			if (r === r1) break
		}
	}
}

/**
 * Connects two cells with an L of box-drawing stubs (used for sub-cell-sized corner arcs). A
 * diagonal step continues the previous run's direction first, so a rounded corner's elbow lands
 * on the cell where the two edges meet rather than one cell inside the shape.
 */
function connectCells(
	screen: Screen,
	cA: number,
	rA: number,
	cB: number,
	rB: number,
	verticalFirst: boolean,
	style: LineStyle,
	visible: CellTest | null
): void {
	if (cA === cB && rA === rB) return
	if (rA === rB) {
		drawLineRun(screen, cA, rA, cB, rB, true, style, visible)
	} else if (cA === cB) {
		drawLineRun(screen, cA, rA, cB, rB, false, style, visible)
	} else if (verticalFirst) {
		drawLineRun(screen, cA, rA, cA, rB, false, style, visible)
		drawLineRun(screen, cA, rB, cB, rB, true, style, visible)
	} else {
		drawLineRun(screen, cA, rA, cB, rA, true, style, visible)
		drawLineRun(screen, cB, rA, cB, rB, false, style, visible)
	}
}

const DASH_CODES = { solid: 0, dashed: 1, dotted: 2 } as const

// Below this share of axis-aligned length a polyline is all sub-cell: a circle's flattened top
// is axis-aligned for a few cells, and mixing box runs into braille there reads as a broken ring.
const AXIS_SHARE_FOR_BOX = 0.5

/**
 * Strokes a cell-space polyline. In 'auto' mode a polyline that is mostly axis-aligned sends
 * its near-axis segments through the line layer (so rectangles and elbows get corners) and the
 * rest through the sub-cell raster; curves and 'subcell' use the raster only. Sub-cell glyphs
 * are written before the line cells so a cell with both keeps the box glyph (the line layer
 * resolves last).
 */
export function strokePolyline(
	screen: Screen,
	raster: SubCellRaster,
	poly: Poly,
	closed: boolean,
	mode: 'auto' | 'subcell',
	lineStyle: LineStyle,
	cellStyle: Partial<CellStyle>,
	visible: CellTest | null = null
): void {
	const pts = poly.points
	const n = poly.count
	if (n < 2) return
	const segments = closed ? n : n - 1
	const heavy = lineStyle.weight === 'heavy'
	const dash = DASH_CODES[lineStyle.dash ?? 'solid']

	if (mode === 'auto') {
		let total = 0
		let axis = 0
		for (let i = 0; i < segments; i++) {
			const j = i + 1 === n ? 0 : i + 1
			const dx = Math.abs(pts[j * 2] - pts[i * 2])
			const dy = Math.abs(pts[j * 2 + 1] - pts[i * 2 + 1])
			const len = Math.hypot(dx, dy)
			total += len
			if (classifySegment(dx, dy) !== SEG_SUBCELL) axis += len
		}
		if (axis < total * AXIS_SHARE_FOR_BOX) mode = 'subcell'
	}

	// Pass 1: sub-cell segments.
	let hasAxis = false
	for (let i = 0; i < segments; i++) {
		const j = i + 1 === n ? 0 : i + 1
		const x0 = pts[i * 2]
		const y0 = pts[i * 2 + 1]
		const x1 = pts[j * 2]
		const y1 = pts[j * 2 + 1]
		const dx = Math.abs(x1 - x0)
		const dy = Math.abs(y1 - y0)
		if (dx === 0 && dy === 0) continue
		if (mode === 'auto' && classifySegment(dx, dy) !== SEG_SUBCELL) {
			hasAxis = true
			continue
		}
		raster.line(x0, y0, x1, y1, heavy, dash)
	}
	if (!raster.isEmpty()) raster.flush(screen, cellStyle, visible)
	if (!hasAxis) return

	// Pass 2: axis runs through the line layer.
	let lastKind = SEG_HORIZONTAL
	for (let i = 0; i < segments; i++) {
		const j = i + 1 === n ? 0 : i + 1
		const x0 = pts[i * 2]
		const y0 = pts[i * 2 + 1]
		const x1 = pts[j * 2]
		const y1 = pts[j * 2 + 1]
		const dx = Math.abs(x1 - x0)
		const dy = Math.abs(y1 - y0)
		if (dx === 0 && dy === 0) continue
		const kind = classifySegment(dx, dy)
		if (kind === SEG_SUBCELL) continue
		const cA = Math.floor(x0)
		const rA = Math.floor(y0)
		const cB = Math.floor(x1)
		const rB = Math.floor(y1)
		if (kind === SEG_TINY) {
			// A sub-cell-sized step (flattened corner arc): keep the neighbouring runs connected.
			connectCells(screen, cA, rA, cB, rB, lastKind === SEG_VERTICAL, lineStyle, visible)
		} else if (kind === SEG_HORIZONTAL) {
			drawLineRun(screen, cA, rA, cB, rA, true, lineStyle, visible)
			if (rB !== rA) drawLineRun(screen, cB, rA, cB, rB, false, lineStyle, visible)
			lastKind = kind
		} else {
			drawLineRun(screen, cA, rA, cA, rB, false, lineStyle, visible)
			if (cB !== cA) drawLineRun(screen, cA, rB, cB, rB, true, lineStyle, visible)
			lastKind = kind
		}
	}
}

/** Axis-aligned bounds of a set of polylines into `out`; false when they hold no points. */
export function polyBounds(
	polys: readonly Poly[],
	out: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const poly of polys) {
		const pts = poly.points
		for (let i = 0; i < poly.count; i++) {
			const x = pts[i * 2]
			const y = pts[i * 2 + 1]
			if (x < minX) minX = x
			if (x > maxX) maxX = x
			if (y < minY) minY = y
			if (y > maxY) maxY = y
		}
	}
	if (minX === Infinity) return false
	out.minX = minX
	out.minY = minY
	out.maxX = maxX
	out.maxY = maxY
	return true
}

/** Even-odd point test over several closed polylines. */
export function pointInPolysEvenOdd(x: number, y: number, polys: readonly Poly[]): boolean {
	let inside = false
	for (const poly of polys) {
		const pts = poly.points
		const n = poly.count
		for (let i = 0, j = n - 1; i < n; j = i++) {
			const xi = pts[i * 2]
			const yi = pts[i * 2 + 1]
			const xj = pts[j * 2]
			const yj = pts[j * 2 + 1]
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
		}
	}
	return inside
}

/** Non-zero winding point test over several closed polylines. */
export function pointInPolysNonZero(x: number, y: number, polys: readonly Poly[]): boolean {
	let winding = 0
	for (const poly of polys) {
		const pts = poly.points
		const n = poly.count
		for (let i = 0, j = n - 1; i < n; j = i++) {
			const xi = pts[i * 2]
			const yi = pts[i * 2 + 1]
			const xj = pts[j * 2]
			const yj = pts[j * 2 + 1]
			if (yj <= y) {
				if (yi > y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) > 0) winding++
			} else if (yi <= y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) < 0) winding--
		}
	}
	return winding !== 0
}

/**
 * Scanline polygon fill sampled at cell centres. Crossing buffers are reused, so filling costs
 * no allocation once warm.
 */
export class ScanlineFiller {
	private xs = new Float64Array(64)
	private dirs = new Int8Array(64)
	private readonly bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }

	private grow(): void {
		const xs = new Float64Array(this.xs.length * 2)
		xs.set(this.xs)
		this.xs = xs
		const dirs = new Int8Array(this.dirs.length * 2)
		dirs.set(this.dirs)
		this.dirs = dirs
	}

	fill(polys: readonly Poly[], rule: FillRule, clip: Rect, sink: FillSink): void {
		const b = this.bounds
		if (!polyBounds(polys, b)) return
		const rowStart = Math.max(clip.y, Math.ceil(b.minY - 0.5))
		const rowEnd = Math.min(clip.y + clip.h - 1, Math.floor(b.maxY - 0.5))
		const colMin = Math.max(clip.x, Math.ceil(b.minX - 0.5))
		const colMax = Math.min(clip.x + clip.w - 1, Math.floor(b.maxX - 0.5))
		if (rowStart > rowEnd || colMin > colMax) return

		for (let row = rowStart; row <= rowEnd; row++) {
			const y = row + 0.5
			let count = 0
			for (const poly of polys) {
				const pts = poly.points
				const n = poly.count
				for (let i = 0, j = n - 1; i < n; j = i++) {
					const ya = pts[j * 2 + 1]
					const yb = pts[i * 2 + 1]
					if (ya <= y === yb <= y) continue
					const xa = pts[j * 2]
					const xb = pts[i * 2]
					const x = xa + ((y - ya) * (xb - xa)) / (yb - ya)
					const dir = yb > ya ? 1 : -1
					if (count === this.xs.length) this.grow()
					// Insertion sort: a scanline rarely crosses more than a handful of edges.
					let k = count
					while (k > 0 && this.xs[k - 1] > x) {
						this.xs[k] = this.xs[k - 1]
						this.dirs[k] = this.dirs[k - 1]
						k--
					}
					this.xs[k] = x
					this.dirs[k] = dir
					count++
				}
			}
			if (count < 2) continue
			if (rule === 'evenodd') {
				for (let k = 0; k + 1 < count; k += 2) {
					this.span(this.xs[k], this.xs[k + 1], row, colMin, colMax, sink)
				}
			} else {
				let winding = 0
				for (let k = 0; k + 1 < count; k++) {
					winding += this.dirs[k]
					if (winding !== 0) this.span(this.xs[k], this.xs[k + 1], row, colMin, colMax, sink)
				}
			}
		}
	}

	private span(
		xl: number,
		xr: number,
		row: number,
		colMin: number,
		colMax: number,
		sink: FillSink
	): void {
		const from = Math.max(colMin, Math.ceil(xl - 0.5))
		const to = Math.min(colMax, Math.floor(xr - 0.5))
		for (let col = from; col <= to; col++) sink.fillCell(col, row)
	}
}
