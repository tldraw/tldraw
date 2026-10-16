import { Path2DPolyfill, PathOp } from '../bootstrap/path2d'
import { CELL_H, CELL_W } from '../editor/constants'
import { GlyphSet } from '../terminal/chars'
import { ParsedColor, Rgb, blend, parseColor } from '../terminal/colors'
import { CellStyle, LineStyle, Rect, Screen } from '../terminal/Screen'
import { stringWidth } from '../terminal/width'
import {
	CellMask,
	CellTest,
	FillRule,
	FillSink,
	Poly,
	ScanlineFiller,
	StrokeMode,
	SubCellRaster,
	polyBounds,
	pointInPolysEvenOdd,
	pointInPolysNonZero,
	strokePolyline,
} from './raster'

export interface TerminalCanvasOptions {
	cellW?: number
	cellH?: number
	/** What the terminal shows where no cell has a background; translucent fills blend over it. */
	background: Rgb
	stroke: StrokeMode
	/** Cells holding shape text; line strokes skip them so labels survive selection outlines. */
	protect?: CellMask | null
}

export interface TransformLike {
	a: number
	b: number
	c: number
	d: number
	e: number
	f: number
}

interface ClipRegion {
	minCol: number
	minRow: number
	maxCol: number
	maxRow: number
	/** Null for a plain axis-aligned rectangle, where the cell range is the whole test. */
	polys: Poly[] | null
	rule: FillRule
}

interface SavedState {
	a: number
	b: number
	c: number
	d: number
	e: number
	f: number
	fillStyle: string
	strokeStyle: string
	lineWidth: number
	globalAlpha: number
	lineCap: string
	lineJoin: string
	lineDashOffset: number
	font: string
	textAlign: string
	textBaseline: string
	dash: number[]
	clips: readonly ClipRegion[]
}

interface FlattenCacheEntry {
	a: number
	b: number
	c: number
	d: number
	e: number
	f: number
	polys: Poly[]
}

const FLATTEN_TOLERANCE = 0.25
const DIM_ALPHA = 0.3
const HEAVY_DEVICE_PX = 3
const TAU = Math.PI * 2
const DEFAULT_COLOR: ParsedColor = { rgb: -1, alpha: 1 }

const flattenCache = new WeakMap<Path2DPolyfill, FlattenCacheEntry>()
const EMPTY_CLIPS: readonly ClipRegion[] = []

function isPath(value: unknown): value is Path2DPolyfill {
	return typeof value === 'object' && value !== null && Array.isArray((value as Path2DPolyfill).ops)
}

function toPolys(flat: number[][]): Poly[] {
	const polys: Poly[] = []
	for (const sub of flat) polys.push({ points: sub, count: sub.length >> 1 })
	return polys
}

/** A flattened subpath is an axis-aligned rectangle when its points alternate x/y changes. */
function isAxisRect(polys: readonly Poly[]): boolean {
	if (polys.length !== 1) return false
	const { points, count } = polys[0]
	if (count !== 5 && count !== 4) return false
	for (let i = 0; i < 4; i++) {
		const j = (i + 1) % 4
		const sameX = Math.abs(points[i * 2] - points[j * 2]) < 1e-6
		const sameY = Math.abs(points[i * 2 + 1] - points[j * 2 + 1]) < 1e-6
		if (sameX === sameY) return false
	}
	return true
}

class BgSink implements FillSink {
	screen!: Screen
	rgb = 0
	alpha = 1
	visible: CellTest | null = null

	fillCell(col: number, row: number): void {
		if (this.visible && !this.visible(col, row)) return
		if (this.alpha >= 0.999) this.screen.setBg(col, row, this.rgb)
		else this.screen.blendBg(col, row, this.rgb, this.alpha)
	}
}

/**
 * The CanvasRenderingContext2D subset tldraw's default overlay utils draw with, rasterized onto a
 * Screen: axis-aligned strokes become box-drawing runs, other strokes sub-cell glyphs, fills set or
 * blend cell backgrounds, and a fill smaller than a cell becomes one glyph (handles). Paths are
 * kept in cell space; `Path2D` arguments are flattened through the current transform and cached per
 * path identity + transform (indicator paths are stable per shape).
 */
export class TerminalCanvas {
	fillStyle = '#000000'
	strokeStyle = '#000000'
	lineWidth = 1
	globalAlpha = 1
	lineCap = 'butt'
	lineJoin = 'miter'
	lineDashOffset = 0
	font = '10px sans-serif'
	textAlign = 'start'
	textBaseline = 'alphabetic'
	readonly canvas: { width: number; height: number }
	readonly strokeMode: StrokeMode
	readonly background: Rgb
	/**
	 * Strokes recolour cells the shape pass drew on instead of replacing them. Set for the selection
	 * and shape indicator overlays, which tldraw draws as thin outlines over a still-visible stroke;
	 * one glyph per cell makes recolouring the closest reading of that.
	 */
	mergeStrokes = false

	private readonly screen: Screen
	private readonly glyphs: GlyphSet
	private readonly cellW: number
	private readonly cellH: number
	private readonly protect: CellMask | null
	private readonly raster: SubCellRaster
	private readonly filler = new ScanlineFiller()
	private readonly bgSink = new BgSink()
	private readonly visibleFn: CellTest
	private readonly strokeVisibleFn: CellTest
	private viewport: Rect

	// Current transform (user → device px) and its cell-space form.
	private a = 1
	private b = 0
	private c = 0
	private d = 1
	private e = 0
	private f = 0
	private dash: number[] = []
	private clips: readonly ClipRegion[] = EMPTY_CLIPS
	private readonly stack: SavedState[] = []

	private path = new Path2DPolyfill()
	private hasCurrentPoint = false
	private ux = 0
	private uy = 0
	private arcCount = 0
	private arcCx = 0
	private arcCy = 0
	private arcSweep = 0
	private lastGlyphCol = -1
	private lastGlyphRow = -1
	private readonly lineStyle: LineStyle = { fg: -1, weight: 'light', dash: 'solid' }
	private readonly cellStyle: Partial<CellStyle> = { fg: -1, dim: false }
	private readonly bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }

	constructor(screen: Screen, viewport: Rect, opts: TerminalCanvasOptions) {
		this.screen = screen
		this.glyphs = screen.getGlyphSet()
		this.viewport = viewport
		this.cellW = opts.cellW ?? CELL_W
		this.cellH = opts.cellH ?? CELL_H
		this.background = opts.background
		this.strokeMode = opts.stroke
		this.protect = opts.protect ?? null
		this.raster = new SubCellRaster(opts.stroke, this.glyphs)
		this.raster.resize(screen.cols, screen.rows)
		this.canvas = { width: viewport.w * this.cellW, height: viewport.h * this.cellH }
		this.visibleFn = this.cellVisible.bind(this)
		this.strokeVisibleFn = this.strokeVisible.bind(this)
		this.bgSink.screen = screen
	}

	/** Resets all state for a new frame (the viewport may have moved). */
	reset(viewport: Rect): void {
		this.viewport = viewport
		this.canvas.width = viewport.w * this.cellW
		this.canvas.height = viewport.h * this.cellH
		this.raster.resize(this.screen.cols, this.screen.rows)
		this.stack.length = 0
		this.clips = EMPTY_CLIPS
		this.dash = []
		this.resetTransform()
		this.fillStyle = '#000000'
		this.strokeStyle = '#000000'
		this.lineWidth = 1
		this.globalAlpha = 1
		this.lineDashOffset = 0
		this.lastGlyphCol = -1
		this.lastGlyphRow = -1
		this.mergeStrokes = false
		this.beginPath()
	}

	// ---- state -----------------------------------------------------------------------------

	save(): void {
		this.stack.push({
			a: this.a,
			b: this.b,
			c: this.c,
			d: this.d,
			e: this.e,
			f: this.f,
			fillStyle: this.fillStyle,
			strokeStyle: this.strokeStyle,
			lineWidth: this.lineWidth,
			globalAlpha: this.globalAlpha,
			lineCap: this.lineCap,
			lineJoin: this.lineJoin,
			lineDashOffset: this.lineDashOffset,
			font: this.font,
			textAlign: this.textAlign,
			textBaseline: this.textBaseline,
			dash: this.dash,
			clips: this.clips,
		})
	}

	restore(): void {
		const s = this.stack.pop()
		if (!s) return
		this.a = s.a
		this.b = s.b
		this.c = s.c
		this.d = s.d
		this.e = s.e
		this.f = s.f
		this.fillStyle = s.fillStyle
		this.strokeStyle = s.strokeStyle
		this.lineWidth = s.lineWidth
		this.globalAlpha = s.globalAlpha
		this.lineCap = s.lineCap
		this.lineJoin = s.lineJoin
		this.lineDashOffset = s.lineDashOffset
		this.font = s.font
		this.textAlign = s.textAlign
		this.textBaseline = s.textBaseline
		this.dash = s.dash
		this.clips = s.clips
	}

	// ---- transforms ------------------------------------------------------------------------

	setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
		this.a = a
		this.b = b
		this.c = c
		this.d = d
		this.e = e
		this.f = f
	}

	resetTransform(): void {
		this.setTransform(1, 0, 0, 1, 0, 0)
	}

	/** Post-multiplies like the canvas: the new matrix is applied to points before the old one. */
	transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
		const { a: ma, b: mb, c: mc, d: md, e: me, f: mf } = this
		this.a = ma * a + mc * b
		this.b = mb * a + md * b
		this.c = ma * c + mc * d
		this.d = mb * c + md * d
		this.e = ma * e + mc * f + me
		this.f = mb * e + md * f + mf
	}

	translate(x: number, y: number): void {
		this.transform(1, 0, 0, 1, x, y)
	}

	rotate(radians: number): void {
		const cos = Math.cos(radians)
		const sin = Math.sin(radians)
		this.transform(cos, sin, -sin, cos, 0, 0)
	}

	scale(x: number, y: number): void {
		this.transform(x, 0, 0, y, 0, 0)
	}

	getTransform(): TransformLike {
		return { a: this.a, b: this.b, c: this.c, d: this.d, e: this.e, f: this.f }
	}

	private cellX(x: number, y: number): number {
		return (this.a * x + this.c * y + this.e) / this.cellW + this.viewport.x
	}

	private cellY(x: number, y: number): number {
		return (this.b * x + this.d * y + this.f) / this.cellH + this.viewport.y
	}

	/** Device-px scale of the x axis, used for line weights and text metrics. */
	private deviceScale(): number {
		const s = Math.hypot(this.a, this.b)
		return s > 0 ? s : 1
	}

	// ---- path building -----------------------------------------------------------------------

	beginPath(): void {
		this.path = new Path2DPolyfill()
		this.hasCurrentPoint = false
		this.arcCount = 0
	}

	closePath(): void {
		this.path.closePath()
	}

	moveTo(x: number, y: number): void {
		this.path.moveTo(this.cellX(x, y), this.cellY(x, y))
		this.ux = x
		this.uy = y
		this.hasCurrentPoint = true
	}

	lineTo(x: number, y: number): void {
		if (!this.hasCurrentPoint) {
			this.moveTo(x, y)
			return
		}
		this.path.lineTo(this.cellX(x, y), this.cellY(x, y))
		this.ux = x
		this.uy = y
	}

	quadraticCurveTo(x1: number, y1: number, x: number, y: number): void {
		if (!this.hasCurrentPoint) this.moveTo(x1, y1)
		this.path.quadraticCurveTo(
			this.cellX(x1, y1),
			this.cellY(x1, y1),
			this.cellX(x, y),
			this.cellY(x, y)
		)
		this.ux = x
		this.uy = y
	}

	bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
		if (!this.hasCurrentPoint) this.moveTo(x1, y1)
		this.path.bezierCurveTo(
			this.cellX(x1, y1),
			this.cellY(x1, y1),
			this.cellX(x2, y2),
			this.cellY(x2, y2),
			this.cellX(x, y),
			this.cellY(x, y)
		)
		this.ux = x
		this.uy = y
	}

	rect(x: number, y: number, w: number, h: number): void {
		this.moveTo(x, y)
		this.lineTo(x + w, y)
		this.lineTo(x + w, y + h)
		this.lineTo(x, y + h)
		this.closePath()
		this.moveTo(x, y)
	}

	roundRect(
		x: number,
		y: number,
		w: number,
		h: number,
		radii: number | { x?: number } | Array<number | { x?: number }> = 0
	): void {
		const first = Array.isArray(radii) ? radii[0] : radii
		let r = typeof first === 'number' ? first : (first?.x ?? 0)
		r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))
		if (r === 0) {
			this.rect(x, y, w, h)
			return
		}
		this.moveTo(x + r, y)
		this.lineTo(x + w - r, y)
		this.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
		this.lineTo(x + w, y + h - r)
		this.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
		this.lineTo(x + r, y + h)
		this.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
		this.lineTo(x, y + r)
		this.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
		this.closePath()
		this.moveTo(x, y)
	}

	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		counterclockwise = false
	): void {
		this.ellipse(x, y, radius, radius, 0, startAngle, endAngle, counterclockwise)
	}

	ellipse(
		x: number,
		y: number,
		radiusX: number,
		radiusY: number,
		rotation: number,
		startAngle: number,
		endAngle: number,
		counterclockwise = false
	): void {
		let delta = endAngle - startAngle
		if (!counterclockwise) {
			if (delta >= TAU) delta = TAU
			else {
				delta %= TAU
				if (delta < 0) delta += TAU
			}
		} else if (-delta >= TAU) delta = -TAU
		else {
			delta %= TAU
			if (delta > 0) delta -= TAU
		}
		const cosR = Math.cos(rotation)
		const sinR = Math.sin(rotation)
		const px = radiusX * Math.cos(startAngle)
		const py = radiusY * Math.sin(startAngle)
		const startX = x + px * cosR - py * sinR
		const startY = y + px * sinR + py * cosR
		// Like a real canvas the arc joins the current subpath with a straight segment
		// (ArrowHintOverlayUtil relies on moveTo + arc producing one clean circle).
		if (this.hasCurrentPoint) this.lineTo(startX, startY)
		else this.moveTo(startX, startY)
		this.arcCount++
		this.arcCx = this.cellX(x, y)
		this.arcCy = this.cellY(x, y)
		this.arcSweep = Math.abs(delta)
		if (delta === 0 || radiusX === 0 || radiusY === 0) return

		const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9))
		const step = delta / segments
		const k = (4 / 3) * Math.tan(step / 4)
		let theta = startAngle
		for (let i = 0; i < segments; i++) {
			const next = theta + step
			const c0 = Math.cos(theta)
			const s0 = Math.sin(theta)
			const c1 = Math.cos(next)
			const s1 = Math.sin(next)
			// Control points of the quarter-arc Bézier, in the ellipse's local frame.
			const p1x = (c0 - k * s0) * radiusX
			const p1y = (s0 + k * c0) * radiusY
			const p2x = (c1 + k * s1) * radiusX
			const p2y = (s1 - k * c1) * radiusY
			const p3x = c1 * radiusX
			const p3y = s1 * radiusY
			this.bezierCurveTo(
				x + p1x * cosR - p1y * sinR,
				y + p1x * sinR + p1y * cosR,
				x + p2x * cosR - p2y * sinR,
				y + p2x * sinR + p2y * cosR,
				x + p3x * cosR - p3y * sinR,
				y + p3x * sinR + p3y * cosR
			)
			theta = next
		}
	}

	arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
		const temp = new Path2DPolyfill()
		if (this.hasCurrentPoint) temp.moveTo(this.ux, this.uy)
		temp.arcTo(x1, y1, x2, y2, radius)
		this.appendUserOps(temp.ops, this.hasCurrentPoint ? 1 : 0)
	}

	/** Replays user-space ops onto the current path through the current transform. */
	private appendUserOps(ops: readonly PathOp[], start: number): void {
		for (let i = start; i < ops.length; i++) {
			const op = ops[i]
			switch (op.type) {
				case 'move':
					this.moveTo(op.x, op.y)
					break
				case 'line':
					this.lineTo(op.x, op.y)
					break
				case 'quad':
					this.quadraticCurveTo(op.x1, op.y1, op.x, op.y)
					break
				case 'cubic':
					this.bezierCurveTo(op.x1, op.y1, op.x2, op.y2, op.x, op.y)
					break
				case 'close':
					this.closePath()
					break
			}
		}
	}

	// ---- resolving paths and colours ---------------------------------------------------------

	private flattenCurrent(): Poly[] {
		return toPolys(this.path.flatten(null, FLATTEN_TOLERANCE))
	}

	/** Flattens a user-space path into cell space; `cache` for Path2D arguments (stable identity). */
	private flattenPath(path: Path2DPolyfill, cache: boolean): Poly[] {
		const ca = this.a / this.cellW
		const cb = this.b / this.cellH
		const cc = this.c / this.cellW
		const cd = this.d / this.cellH
		const ce = this.e / this.cellW + this.viewport.x
		const cf = this.f / this.cellH + this.viewport.y
		const cached = cache ? flattenCache.get(path) : undefined
		if (
			cached &&
			cached.a === ca &&
			cached.b === cb &&
			cached.c === cc &&
			cached.d === cd &&
			cached.e === ce &&
			cached.f === cf
		) {
			return cached.polys
		}
		const polys = toPolys(
			path.flatten({ a: ca, b: cb, c: cc, d: cd, e: ce, f: cf }, FLATTEN_TOLERANCE)
		)
		if (cache) flattenCache.set(path, { a: ca, b: cb, c: cc, d: cd, e: ce, f: cf, polys })
		return polys
	}

	private resolve(
		pathOrRule: Path2DPolyfill | FillRule | undefined,
		rule: FillRule | undefined
	): { polys: Poly[]; rule: FillRule; external: boolean } {
		if (isPath(pathOrRule)) {
			return { polys: this.flattenPath(pathOrRule, true), rule: rule ?? 'nonzero', external: true }
		}
		return { polys: this.flattenCurrent(), rule: pathOrRule ?? 'nonzero', external: false }
	}

	private color(style: string): ParsedColor {
		return parseColor(style) ?? DEFAULT_COLOR
	}

	private cellVisible(col: number, row: number): boolean {
		const clips = this.clips
		for (let i = 0; i < clips.length; i++) {
			const clip = clips[i]
			if (col < clip.minCol || col > clip.maxCol || row < clip.minRow || row > clip.maxRow) {
				return false
			}
			if (clip.polys) {
				const x = col + 0.5
				const y = row + 0.5
				const inside =
					clip.rule === 'evenodd'
						? pointInPolysEvenOdd(x, y, clip.polys)
						: pointInPolysNonZero(x, y, clip.polys)
				if (!inside) return false
			}
		}
		return true
	}

	private strokeVisible(col: number, row: number): boolean {
		if (this.protect && this.protect.has(col, row)) return false
		return this.cellVisible(col, row)
	}

	private visibleOrNull(): CellTest | null {
		return this.clips.length > 0 ? this.visibleFn : null
	}

	/**
	 * True when the polylines fit inside a single cell in both axes (handles are 8 px = 1 col), or
	 * form one quad whose edges are no longer than a cell: a rotated handle's bounding box spans two
	 * cells, but it is still one handle.
	 */
	private isTiny(polys: readonly Poly[]): boolean {
		const b = this.bounds
		if (b.maxX - b.minX <= 1 + 1e-6 && b.maxY - b.minY <= 1 + 1e-6) return true
		if (polys.length !== 1 || b.maxX - b.minX > Math.SQRT2 || b.maxY - b.minY > Math.SQRT2 / 2) {
			return false
		}
		const { points, count } = polys[0]
		if (count !== 4 && count !== 5) return false
		for (let i = 0; i < 4; i++) {
			const j = (i + 1) % 4
			const dx = (points[j * 2] - points[i * 2]) * this.cellW
			const dy = (points[j * 2 + 1] - points[i * 2 + 1]) * this.cellH
			if (Math.hypot(dx, dy) > this.cellW + 0.5) return false
		}
		return true
	}

	private tinyGlyph(polys: readonly Poly[], external: boolean): string {
		const g = this.glyphs
		const b = this.bounds
		const round = external
			? polys.length > 0 && polys[0].count >= 8
			: this.arcCount > 0 && polys.length === 1
		if (!round) return g.square
		if (!external && Math.abs(this.arcSweep - Math.PI) < 0.2) {
			// A half disc (note clone handles): pick the side facing away from the arc centre.
			const dx = ((b.minX + b.maxX) / 2 - this.arcCx) * this.cellW
			const dy = ((b.minY + b.maxY) / 2 - this.arcCy) * this.cellH
			if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? g.halfDiscRight : g.halfDiscLeft
			return dy >= 0 ? g.caretDown : g.caretUp
		}
		return g.dot
	}

	private putGlyph(col: number, row: number, glyph: string, rgb: Rgb, dim: boolean): void {
		// Handles never cover shape text: a text shape's corner handles land on its glyphs.
		if (!this.strokeVisible(col, row)) return
		this.cellStyle.fg = rgb
		this.cellStyle.dim = dim
		this.screen.put(col, row, glyph, this.cellStyle)
		this.lastGlyphCol = col
		this.lastGlyphRow = row
	}

	// ---- painting ------------------------------------------------------------------------------

	fill(pathOrRule?: Path2DPolyfill | FillRule, rule?: FillRule): void {
		const resolved = this.resolve(pathOrRule, rule)
		this.fillPolys(resolved.polys, resolved.rule, resolved.external)
	}

	private fillPolys(polys: Poly[], rule: FillRule, external: boolean): void {
		if (!polyBounds(polys, this.bounds)) return
		const color = this.color(this.fillStyle)
		const alpha = color.alpha * this.globalAlpha
		if (alpha <= 0) return
		const b = this.bounds
		if (this.isTiny(polys)) {
			const col = Math.floor((b.minX + b.maxX) / 2)
			const row = Math.floor((b.minY + b.maxY) / 2)
			this.putGlyph(col, row, this.tinyGlyph(polys, external), color.rgb, alpha < DIM_ALPHA)
			return
		}
		const sink = this.bgSink
		sink.rgb = color.rgb === -1 ? this.background : color.rgb
		sink.alpha = alpha
		sink.visible = this.visibleOrNull()
		this.filler.fill(polys, rule, this.screen.getClip(), sink)
	}

	stroke(path?: Path2DPolyfill): void {
		const resolved = this.resolve(path, undefined)
		this.strokePolys(resolved.polys)
	}

	private strokePolys(polys: Poly[]): void {
		if (!polyBounds(polys, this.bounds)) return
		const color = this.color(this.strokeStyle)
		const alpha = color.alpha * this.globalAlpha
		if (alpha <= 0) return
		const b = this.bounds
		if (this.isTiny(polys)) {
			// A sub-cell outline (handle borders, snap crosses): one glyph. When a tiny fill just drew
			// the handle in this cell, the border colour wins: tldraw fills handles with the canvas
			// background, which would make the glyph invisible on the painted canvas.
			const col = Math.floor((b.minX + b.maxX) / 2)
			const row = Math.floor((b.minY + b.maxY) / 2)
			if (col === this.lastGlyphCol && row === this.lastGlyphRow) {
				if (color.rgb !== -1 && this.strokeVisible(col, row)) this.screen.setFg(col, row, color.rgb)
				return
			}
			this.putGlyph(col, row, this.glyphs.cursorPointer, color.rgb, alpha < DIM_ALPHA)
			return
		}
		const dim = alpha < DIM_ALPHA
		// Line-layer cells have no dim attribute, so faint strokes fade toward the background
		// instead (binding hints at 0.16, brush strokes at 0.25).
		const fg = dim && color.rgb !== -1 ? blend(color.rgb, this.background, 0.5) : color.rgb
		const style = this.lineStyle
		style.fg = fg
		style.weight = this.lineWidth * this.deviceScale() >= HEAVY_DEVICE_PX ? 'heavy' : 'light'
		style.dash = this.hasDash() ? 'dashed' : 'solid'
		this.cellStyle.fg = fg
		this.cellStyle.dim = dim
		const visible = this.protect || this.clips.length > 0 ? this.strokeVisibleFn : null
		// Closed subpaths already repeat their first point (Path2DPolyfill.flatten), so every
		// polyline is stroked open.
		for (const poly of polys) {
			strokePolyline(
				this.screen,
				this.raster,
				poly,
				false,
				'auto',
				style,
				this.cellStyle,
				visible,
				this.mergeStrokes
			)
		}
	}

	private hasDash(): boolean {
		for (const d of this.dash) if (d > 0) return true
		return false
	}

	clip(pathOrRule?: Path2DPolyfill | FillRule, rule?: FillRule): void {
		const resolved = this.resolve(pathOrRule, rule)
		const polys = resolved.polys
		const region: ClipRegion = polyBounds(polys, this.bounds)
			? {
					minCol: Math.floor(this.bounds.minX),
					minRow: Math.floor(this.bounds.minY),
					maxCol: Math.floor(this.bounds.maxX),
					maxRow: Math.floor(this.bounds.maxY),
					polys: isAxisRect(polys) ? null : polys,
					rule: resolved.rule,
				}
			: { minCol: 0, minRow: 0, maxCol: -1, maxRow: -1, polys: null, rule: resolved.rule }
		this.clips = [...this.clips, region]
	}

	fillRect(x: number, y: number, w: number, h: number): void {
		const temp = new Path2DPolyfill()
		temp.rect(x, y, w, h)
		this.fillPolys(this.flattenPath(temp, false), 'nonzero', false)
	}

	strokeRect(x: number, y: number, w: number, h: number): void {
		const temp = new Path2DPolyfill()
		temp.rect(x, y, w, h)
		this.strokePolys(this.flattenPath(temp, false))
	}

	/** The App clears the Screen before each frame, so the canvas never needs to. */
	clearRect(_x: number, _y: number, _w: number, _h: number): void {}

	setLineDash(segments: number[]): void {
		this.dash = segments.slice()
	}

	getLineDash(): number[] {
		return this.dash.slice()
	}

	// ---- text ----------------------------------------------------------------------------------

	measureText(text: string): { width: number } {
		return { width: (stringWidth(text) * this.cellW) / this.deviceScale() }
	}

	fillText(text: string, x: number, y: number, maxWidth?: number): void {
		if (text.length === 0) return
		const color = this.color(this.fillStyle)
		const width = stringWidth(text)
		const cx = this.cellX(x, y)
		const cy = this.cellY(x, y)
		let col = Math.floor(cx)
		if (this.textAlign === 'center') col = Math.round(cx - width / 2)
		else if (this.textAlign === 'right' || this.textAlign === 'end') col = Math.round(cx) - width
		let row: number
		switch (this.textBaseline) {
			case 'top':
			case 'hanging':
				row = Math.floor(cy)
				break
			case 'middle':
				row = Math.round(cy - 0.5)
				break
			default:
				row = Math.ceil(cy) - 1
		}
		if (!this.cellVisible(col, row)) return
		this.cellStyle.fg = color.rgb
		this.cellStyle.dim = color.alpha * this.globalAlpha < DIM_ALPHA
		const maxCells =
			maxWidth === undefined ? undefined : Math.max(1, Math.floor(maxWidth / this.cellW))
		this.screen.text(col, row, text, this.cellStyle, maxCells)
	}

	strokeText(text: string, x: number, y: number, maxWidth?: number): void {
		this.fillText(text, x, y, maxWidth)
	}

	// ---- stubs so a future overlay util never throws ----------------------------------------

	isPointInPath(): boolean {
		return false
	}

	isPointInStroke(): boolean {
		return false
	}

	drawImage(): void {}
}
