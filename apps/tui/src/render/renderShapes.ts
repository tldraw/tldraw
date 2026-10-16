import { Editor, Geometry2d, Group2d, Mat, TLShape, TLShapeId } from '@tldraw/editor'
import { unsafe__withoutCapture } from '@tldraw/state'
import type {
	TLArrowShape,
	TLArrowShapeArrowheadStyle,
	TLDefaultDashStyle,
	TLDefaultFillStyle,
	TLDefaultSizeStyle,
	TLFrameShape,
	TLGeoShape,
	TLNoteShape,
	TLTextShape,
	TLThemeColors,
} from '@tldraw/tlschema'
import { getArrowInfo, renderPlaintextFromRichText } from 'tldraw'
import { CELL_H, CELL_W, LABEL_PADDING } from '../editor/constants'
import { layoutText } from '../editor/textMeasure'
import { GlyphSet } from '../terminal/chars'
import { Rgb } from '../terminal/colors'
import { CellStyle, LineStyle, Rect, Screen } from '../terminal/Screen'
import { graphemes, stringWidth } from '../terminal/width'
import type { Cell, EditCaret } from '../ui/UiState'
import {
	CellMask,
	FillSink,
	Poly,
	ScanlineFiller,
	StrokeMode,
	SubCellRaster,
	getTextMask,
	strokePolyline,
} from './raster'
import {
	FillLook,
	fadeRgb,
	fillLook,
	getThemeColors,
	labelRgb,
	paletteRgb,
	shapeRgb,
} from './theme'

export interface CameraLike {
	x: number
	y: number
	z: number
}

export interface RenderOptions {
	glyphs: GlyphSet
	colorMode: 'light' | 'dark'
	stroke: StrokeMode
	/** The terminal background (probed or assumed); translucent fills and faded strokes blend over it. */
	background: Rgb
	ambiguousWide?: boolean
	/** Replaces `editor.getCamera()` (text export renders a page region at its own zoom). */
	camera?: CameraLike
	/** Replaces the culled, z-sorted list from the editor (text export). */
	shapes?: readonly TLShape[]
	/** A private geometry cache (text export must not evict the interactive frame's entries). */
	cache?: ShapeRenderCache
}

export type LabelAlign = 'start' | 'center' | 'end'

/** Where a shape's text lands on the screen, in terminal cells. */
export interface LabelPlacement {
	lines: string[]
	/** Cell width of each line. */
	widths: number[]
	/** Start column of each line. */
	cols: number[]
	/** Row of the first line. */
	row0: number
}

export interface ShapeCachePart extends Poly {
	geometry: Geometry2d | null
	points: Float64Array
	isLabel: boolean
	isClosed: boolean
	isFilled: boolean
	minX: number
	minY: number
	maxX: number
	maxY: number
}

export interface ShapeCacheEntry {
	shape: TLShape
	geometry: Geometry2d | null
	transform: Mat | null
	camX: number
	camY: number
	camZ: number
	originX: number
	originY: number
	stamp: number
	parts: ShapeCachePart[]
	minX: number
	minY: number
	maxX: number
	maxY: number
	label: LabelPlacement | null
	labelText: string | null
	labelCol: number
	labelRow: number
	labelW: number
	labelH: number
	labelAlign: LabelAlign | null
	labelValign: LabelAlign | null
}

/**
 * Cell-space polylines per shape, keyed by shape record, geometry and page transform identity plus
 * the camera, so unchanged shapes cost no geometry reads or allocations during a drag.
 */
export class ShapeRenderCache {
	private readonly entries = new Map<TLShapeId, ShapeCacheEntry>()
	stamp = 0

	get(id: TLShapeId): ShapeCacheEntry | undefined {
		return this.entries.get(id)
	}

	set(id: TLShapeId, entry: ShapeCacheEntry): void {
		this.entries.set(id, entry)
	}

	size(): number {
		return this.entries.size
	}

	/** Drops entries not touched this frame once the map holds more than twice the live shapes. */
	sweep(liveCount: number): void {
		if (this.entries.size <= Math.max(64, liveCount * 2)) return
		for (const [id, entry] of this.entries) {
			if (entry.stamp !== this.stamp) this.entries.delete(id)
		}
	}
}

interface LabelBox {
	x0: number
	y0: number
	x1: number
	y1: number
}

interface LabelSpec {
	text: string
	box: LabelBox
	align: LabelAlign
	valign: LabelAlign
	padX: number
	padY: number
	fg: Rgb
	/** -1 keeps the cell background; arrow labels paint the canvas background to cover the line. */
	bg: Rgb
}

class ShapeFillSink implements FillSink {
	screen!: Screen
	mode: 'bg' | 'blend' | 'glyph' | 'glyphRows' = 'bg'
	rgb: Rgb = 0
	alpha = 1
	glyph = ' '
	readonly style: Partial<CellStyle> = { fg: -1, dim: false }

	fillCell(col: number, row: number): void {
		switch (this.mode) {
			case 'bg':
				this.screen.setBg(col, row, this.rgb)
				break
			case 'blend':
				this.screen.blendBg(col, row, this.rgb, this.alpha)
				break
			case 'glyph':
				this.screen.put(col, row, this.glyph, this.style)
				break
			case 'glyphRows':
				if ((row & 1) === 0) this.screen.put(col, row, this.glyph, this.style)
				break
		}
	}
}

interface Frame {
	editor: Editor
	screen: Screen
	canvas: Rect
	opts: RenderOptions
	glyphs: GlyphSet
	colors: TLThemeColors
	background: Rgb
	ambiguousWide: boolean
	kx: number
	ky: number
	ox: number
	oy: number
	zoom: number
	cache: ShapeRenderCache
	raster: SubCellRaster
	textMask: CellMask
	erasing: readonly TLShapeId[]
	opacity: number
}

const defaultCache = new ShapeRenderCache()
const rasters = new Map<string, SubCellRaster>()
const filler = new ScanlineFiller()
const sink = new ShapeFillSink()
const lineStyle: LineStyle = { fg: -1, weight: 'light', dash: 'solid' }
const cellStyle: Partial<CellStyle> = { fg: -1, dim: false }
const textStyle: Partial<CellStyle> = { fg: -1, dim: false }
// Only labels that paint a background (arrows) may touch the cell's bg; a `bg: -1` key would
// erase the fill under geo and note labels.
const textStyleBg: Partial<CellStyle> = { fg: -1, bg: -1, dim: false }
const polyScratch: Poly[] = []
const bboxPoly: ShapeCachePart = {
	geometry: null,
	points: new Float64Array(10),
	count: 5,
	isLabel: false,
	isClosed: true,
	isFilled: false,
	minX: 0,
	minY: 0,
	maxX: 0,
	maxY: 0,
}
const labelSpecScratch: LabelSpec = {
	text: '',
	box: { x0: 0, y0: 0, x1: 0, y1: 0 },
	align: 'center',
	valign: 'center',
	padX: 0,
	padY: 0,
	fg: -1,
	bg: -1,
}
const frameScratch: Frame = {
	editor: null as unknown as Editor,
	screen: null as unknown as Screen,
	canvas: { x: 0, y: 0, w: 0, h: 0 },
	opts: null as unknown as RenderOptions,
	glyphs: null as unknown as GlyphSet,
	colors: null as unknown as TLThemeColors,
	background: 0,
	ambiguousWide: false,
	kx: 1,
	ky: 1,
	ox: 0,
	oy: 0,
	zoom: 1,
	cache: defaultCache,
	raster: null as unknown as SubCellRaster,
	textMask: null as unknown as CellMask,
	erasing: [],
	opacity: 1,
}

const ERASING_OPACITY = 0.32
// Geos whose outline is all curves read better as pure sub-cell strokes than as a mix of box
// lines (where a flat top happens to be axis-aligned) and braille.
const CURVED_GEOS = new Set(['ellipse', 'oval', 'cloud', 'heart'])
const PLACEHOLDER_TYPES = new Set(['image', 'video', 'embed', 'bookmark'])

function getRaster(mode: StrokeMode, glyphs: GlyphSet): SubCellRaster {
	const key = `${mode}|${glyphs.tier}`
	let raster = rasters.get(key)
	if (!raster) {
		raster = new SubCellRaster(mode, glyphs)
		rasters.set(key, raster)
	}
	return raster
}

/**
 * Reads the coarse signals (camera, theme, erasing set) and prepares the frame scratch. Everything
 * per shape afterwards runs without capture; see renderShapes.
 */
function beginFrame(editor: Editor, screen: Screen, canvas: Rect, opts: RenderOptions): Frame {
	const f = frameScratch
	f.editor = editor
	f.screen = screen
	f.canvas = canvas
	f.opts = opts
	f.glyphs = opts.glyphs
	f.colors = getThemeColors(editor, opts.colorMode)
	f.background = opts.background
	f.ambiguousWide = opts.ambiguousWide ?? false
	const cam = opts.camera ?? editor.getCamera()
	f.zoom = cam.z
	f.kx = cam.z / CELL_W
	f.ky = cam.z / CELL_H
	f.ox = canvas.x + cam.x * f.kx
	f.oy = canvas.y + cam.y * f.ky
	f.cache = opts.cache ?? defaultCache
	f.raster = getRaster(opts.stroke, opts.glyphs)
	f.raster.resize(screen.cols, screen.rows)
	f.textMask = getTextMask(screen)
	f.erasing = editor.getErasingShapeIds()
	f.opacity = 1
	sink.screen = screen
	return f
}

/**
 * Draws the current page's shapes into the canvas rect. Captures only coarse signals (the culled,
 * z-sorted shape list, the camera, the theme and the erasing set); per-shape geometry, transforms,
 * masks and props are read inside `unsafe__withoutCapture` because they derive from the records
 * those signals already cover, which keeps the App's render effect cheap on every store commit.
 */
export function renderShapes(
	editor: Editor,
	screen: Screen,
	canvas: Rect,
	opts: RenderOptions
): { rendered: number } {
	const shapes = opts.shapes ?? editor.getCurrentPageRenderingShapesSorted()
	const f = beginFrame(editor, screen, canvas, opts)
	f.textMask.clear()
	let rendered = 0
	unsafe__withoutCapture(() => {
		f.cache.stamp++
		for (let i = 0; i < shapes.length; i++) {
			if (renderShape(f, shapes[i])) rendered++
		}
		f.cache.sweep(shapes.length)
	})
	return { rendered }
}

function newPart(): ShapeCachePart {
	return {
		geometry: null,
		points: new Float64Array(16),
		count: 0,
		isLabel: false,
		isClosed: false,
		isFilled: false,
		minX: 0,
		minY: 0,
		maxX: 0,
		maxY: 0,
	}
}

function newEntry(shape: TLShape): ShapeCacheEntry {
	return {
		shape,
		geometry: null,
		transform: null,
		camX: NaN,
		camY: NaN,
		camZ: NaN,
		originX: NaN,
		originY: NaN,
		stamp: 0,
		parts: [],
		minX: 0,
		minY: 0,
		maxX: 0,
		maxY: 0,
		label: null,
		labelText: null,
		labelCol: 0,
		labelRow: 0,
		labelW: 0,
		labelH: 0,
		labelAlign: null,
		labelValign: null,
	}
}

function ensureEntry(f: Frame, shape: TLShape): ShapeCacheEntry | null {
	const editor = f.editor
	let geometry: Geometry2d
	let transform: Mat
	try {
		geometry = editor.getShapeGeometry(shape)
		transform = editor.getShapePageTransform(shape)
	} catch {
		return null
	}
	const cache = f.cache
	let entry = cache.get(shape.id)
	if (!entry) {
		entry = newEntry(shape)
		cache.set(shape.id, entry)
	}
	entry.stamp = cache.stamp
	if (
		entry.shape === shape &&
		entry.geometry === geometry &&
		entry.transform === transform &&
		entry.camZ === f.zoom &&
		entry.originX === f.ox &&
		entry.originY === f.oy
	) {
		return entry
	}
	entry.shape = shape
	entry.geometry = geometry
	entry.transform = transform
	entry.camZ = f.zoom
	entry.originX = f.ox
	entry.originY = f.oy
	entry.labelText = null
	rebuildParts(f, entry, geometry, transform)
	return entry
}

function rebuildParts(f: Frame, entry: ShapeCacheEntry, geometry: Geometry2d, m: Mat): void {
	const children = geometry instanceof Group2d ? geometry.children : [geometry]
	const { kx, ky, ox, oy } = f
	let n = 0
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (let c = 0; c < children.length; c++) {
		const child = children[c]
		if (child.ignore) continue
		const vertices = child.vertices
		const count = vertices.length
		if (count === 0) continue
		let part = entry.parts[n]
		if (!part) {
			part = newPart()
			entry.parts[n] = part
		}
		n++
		part.geometry = child
		part.isLabel = child.isLabel
		part.isClosed = child.isClosed
		part.isFilled = child.isFilled
		if (part.points.length < count * 2) part.points = new Float64Array(count * 2)
		const pts = part.points
		let pMinX = Infinity
		let pMinY = Infinity
		let pMaxX = -Infinity
		let pMaxY = -Infinity
		// Shape → page → screen px → cells in one pass with no Vec allocation.
		for (let i = 0; i < count; i++) {
			const v = vertices[i]
			const x = ox + (m.a * v.x + m.c * v.y + m.e) * kx
			const y = oy + (m.b * v.x + m.d * v.y + m.f) * ky
			pts[i * 2] = x
			pts[i * 2 + 1] = y
			if (x < pMinX) pMinX = x
			if (x > pMaxX) pMaxX = x
			if (y < pMinY) pMinY = y
			if (y > pMaxY) pMaxY = y
		}
		part.count = count
		part.minX = pMinX
		part.minY = pMinY
		part.maxX = pMaxX
		part.maxY = pMaxY
		if (pMinX < minX) minX = pMinX
		if (pMaxX > maxX) maxX = pMaxX
		if (pMinY < minY) minY = pMinY
		if (pMaxY > maxY) maxY = pMaxY
	}
	entry.parts.length = n
	entry.minX = minX
	entry.minY = minY
	entry.maxX = maxX
	entry.maxY = maxY
}

function renderShape(f: Frame, shape: TLShape): boolean {
	if (shape.type === 'group') return false
	const entry = ensureEntry(f, shape)
	if (!entry || entry.parts.length === 0) return false
	const c = f.canvas
	if (entry.maxX < c.x || entry.minX >= c.x + c.w || entry.maxY < c.y || entry.minY >= c.y + c.h) {
		return false
	}
	f.opacity = shape.opacity * (f.erasing.includes(shape.id) ? ERASING_OPACITY : 1)
	const mask = f.editor.getShapeMask(shape)
	if (mask && mask.length > 0) {
		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity
		for (const p of mask) {
			const x = f.ox + p.x * f.kx
			const y = f.oy + p.y * f.ky
			if (x < minX) minX = x
			if (x > maxX) maxX = x
			if (y < minY) minY = y
			if (y > maxY) maxY = y
		}
		const x0 = Math.floor(minX)
		const y0 = Math.floor(minY)
		const rect: Rect = { x: x0, y: y0, w: Math.floor(maxX) - x0 + 1, h: Math.floor(maxY) - y0 + 1 }
		if (rect.w <= 0 || rect.h <= 0) return false
		f.screen.withClip(rect, () => drawShape(f, shape, entry))
	} else {
		drawShape(f, shape, entry)
	}
	return true
}

function drawShape(f: Frame, shape: TLShape, entry: ShapeCacheEntry): void {
	switch (shape.type) {
		case 'geo':
			drawGeo(f, shape as TLGeoShape, entry)
			break
		case 'text':
			drawText(f, shape as TLTextShape, entry)
			break
		case 'note':
			drawNote(f, shape as TLNoteShape, entry)
			break
		case 'arrow':
			drawArrow(f, shape as TLArrowShape, entry)
			break
		case 'line':
			drawLine(f, shape, entry)
			break
		case 'draw':
			drawDraw(f, shape, entry)
			break
		case 'highlight':
			drawHighlight(f, shape, entry)
			break
		case 'frame':
			drawFrame(f, shape as TLFrameShape, entry)
			break
		default:
			drawPlaceholder(f, shape, entry)
	}
}

// ---- style helpers --------------------------------------------------------------------------

interface StrokeProps {
	color?: string
	dash?: TLDefaultDashStyle
	size?: TLDefaultSizeStyle
}

function dashOf(dash: TLDefaultDashStyle | undefined): 'solid' | 'dashed' | 'dotted' | null {
	switch (dash) {
		case 'none':
			return null
		case 'dashed':
			return 'dashed'
		case 'dotted':
			return 'dotted'
		default:
			return 'solid'
	}
}

/** Sets the shared line/cell styles for a stroke; returns false when the dash style hides it. */
function setStroke(f: Frame, rgb: Rgb, props: StrokeProps): boolean {
	const dash = dashOf(props.dash)
	if (dash === null) return false
	const fg = fadeRgb(rgb, f.background, f.opacity)
	lineStyle.fg = fg
	lineStyle.weight = props.size === 'l' || props.size === 'xl' ? 'heavy' : 'light'
	lineStyle.dash = dash
	cellStyle.fg = fg
	cellStyle.dim = f.opacity < 1
	return true
}

function strokeOutline(f: Frame, entry: ShapeCacheEntry, mode: 'auto' | 'subcell'): void {
	for (const part of entry.parts) {
		if (part.isLabel) continue
		strokePolyline(f.screen, f.raster, part, part.isClosed, mode, lineStyle, cellStyle, null)
	}
}

function collectFillPolys(entry: ShapeCacheEntry, requireFilled: boolean): Poly[] {
	polyScratch.length = 0
	for (const part of entry.parts) {
		if (part.isLabel || !part.isClosed || part.count < 3) continue
		if (requireFilled && !part.isFilled) continue
		polyScratch.push(part)
	}
	return polyScratch
}

function fillBg(f: Frame, polys: readonly Poly[], rgb: Rgb): void {
	if (polys.length === 0) return
	sink.mode = f.opacity < 1 ? 'blend' : 'bg'
	sink.rgb = rgb
	sink.alpha = f.opacity
	filler.fill(polys, 'nonzero', f.screen.getClip(), sink)
}

function fillBlend(f: Frame, polys: readonly Poly[], rgb: Rgb, alpha: number): void {
	if (polys.length === 0) return
	sink.mode = 'blend'
	sink.rgb = rgb
	sink.alpha = alpha
	filler.fill(polys, 'nonzero', f.screen.getClip(), sink)
}

function fillGlyphs(
	f: Frame,
	polys: readonly Poly[],
	glyph: string,
	rgb: Rgb,
	rows: boolean
): void {
	if (polys.length === 0) return
	sink.mode = rows ? 'glyphRows' : 'glyph'
	sink.glyph = glyph
	sink.style.fg = fadeRgb(rgb, f.background, f.opacity)
	sink.style.dim = f.opacity < 1
	filler.fill(polys, 'nonzero', f.screen.getClip(), sink)
}

function applyFill(f: Frame, entry: ShapeCacheEntry, look: FillLook): void {
	if (look.kind === 'none') return
	const polys = collectFillPolys(entry, true)
	switch (look.kind) {
		case 'bg':
			fillBg(f, polys, look.rgb)
			break
		case 'pattern':
			fillGlyphs(f, polys, f.glyphs.patternFill, look.rgb, false)
			break
		case 'lined':
			fillGlyphs(f, polys, f.glyphs.linedFill, look.rgb, true)
			break
	}
}

function toAlign(value: string | undefined): LabelAlign {
	switch (value) {
		case 'start':
		case 'start-legacy':
			return 'start'
		case 'end':
		case 'end-legacy':
			return 'end'
		default:
			return 'center'
	}
}

// ---- labels ---------------------------------------------------------------------------------

function labelPart(entry: ShapeCacheEntry): ShapeCachePart | null {
	for (const part of entry.parts) if (part.isLabel) return part
	return null
}

function setBoxFromPart(box: LabelBox, part: ShapeCachePart): void {
	box.x0 = part.minX
	box.y0 = part.minY
	box.x1 = part.maxX
	box.y1 = part.maxY
}

/**
 * The text a shape shows and where: the isLabel geometry child (already padded by tldraw) for
 * geo, note, text and arrow shapes, the row above the body for frames. Returns false for shapes
 * without text.
 */
function labelSpec(f: Frame, shape: TLShape, entry: ShapeCacheEntry, out: LabelSpec): boolean {
	const colors = f.colors
	out.bg = -1
	out.padX = 0
	out.padY = 0
	switch (shape.type) {
		case 'geo': {
			const geo = shape as TLGeoShape
			const part = labelPart(entry)
			if (!part) return false
			setBoxFromPart(out.box, part)
			out.text = renderPlaintextFromRichText(f.editor, geo.props.richText)
			out.align = toAlign(geo.props.align)
			out.valign = toAlign(geo.props.verticalAlign)
			out.padX = Math.round(LABEL_PADDING * f.kx)
			out.padY = Math.round(LABEL_PADDING * f.ky)
			out.fg = labelRgb(colors, geo.props.labelColor, geo.props.fill)
			return true
		}
		case 'text': {
			const text = shape as TLTextShape
			const part = entry.parts[0]
			setBoxFromPart(out.box, part)
			out.text = renderPlaintextFromRichText(f.editor, text.props.richText)
			out.align = toAlign(text.props.textAlign)
			out.valign = 'start'
			out.fg = labelRgb(colors, text.props.color, null)
			return true
		}
		case 'note': {
			const note = shape as TLNoteShape
			const part = labelPart(entry)
			if (!part) return false
			setBoxFromPart(out.box, part)
			out.text = renderPlaintextFromRichText(f.editor, note.props.richText)
			out.align = toAlign(note.props.align)
			out.valign = toAlign(note.props.verticalAlign)
			out.padX = Math.round(LABEL_PADDING * f.kx)
			out.padY = Math.round(LABEL_PADDING * f.ky)
			// NoteShapeUtil.tsx:136-150: black labels take the note colour's own text variant.
			out.fg =
				note.props.labelColor === 'black'
					? shapeRgb(colors, note.props.color, 'noteText')
					: shapeRgb(colors, note.props.labelColor, 'fill')
			return true
		}
		case 'arrow': {
			const arrow = shape as TLArrowShape
			const part = labelPart(entry)
			if (!part) return false
			setBoxFromPart(out.box, part)
			out.text = renderPlaintextFromRichText(f.editor, arrow.props.richText)
			out.align = 'center'
			out.valign = 'center'
			out.fg = labelRgb(colors, arrow.props.labelColor, null)
			out.bg = f.background
			return true
		}
		case 'frame': {
			const frame = shape as TLFrameShape
			const body = entry.parts[0]
			// The row above the one holding the top border (FrameShapeUtil puts the heading above
			// the frame in screen space).
			out.box.x0 = body.minX
			out.box.x1 = body.maxX
			out.box.y0 = Math.floor(body.minY) - 1
			out.box.y1 = Math.floor(body.minY)
			out.text = frame.props.name || 'Frame'
			out.align = 'start'
			out.valign = 'start'
			out.fg = shapeRgb(colors, 'black', 'frameText')
			return true
		}
		default:
			return false
	}
}

/**
 * Lays the label out at the current zoom inside its box, inset by the padding when the box is
 * big enough, and caches the result on the entry. Null when the box is too small to show text.
 */
function placeLabel(f: Frame, entry: ShapeCacheEntry, spec: LabelSpec): LabelPlacement | null {
	const { box } = spec
	const w = box.x1 - box.x0
	const h = box.y1 - box.y0
	if (w < (spec.padX > 0 ? 3 : 1) || h < 1) return null
	const padX = Math.max(0, Math.min(spec.padX, Math.floor((w - 1) / 2)))
	const padY = Math.max(0, Math.min(spec.padY, Math.floor((h - 1) / 2)))
	const colStart = Math.round(box.x0 + padX)
	const widthCells = Math.max(1, Math.round(box.x1 - padX) - colStart)
	const rowStart = Math.round(box.y0 + padY)
	const heightRows = Math.max(1, Math.round(box.y1 - padY) - rowStart)

	const sameLayout =
		entry.label !== null &&
		entry.labelText === spec.text &&
		entry.labelW === widthCells &&
		entry.labelH === heightRows
	if (
		sameLayout &&
		entry.labelCol === colStart &&
		entry.labelRow === rowStart &&
		entry.labelAlign === spec.align &&
		entry.labelValign === spec.valign
	) {
		return entry.label!
	}

	// A pan only moves the box: the wrapped lines and their widths survive, only positions change.
	const placement = entry.label ?? { lines: [], widths: [], cols: [], row0: 0 }
	if (!sameLayout) {
		const layout = layoutText(spec.text, {
			maxWidthCells: widthCells,
			overflow: 'truncate-ellipsis',
			maxLines: heightRows,
			ambiguousWide: f.ambiguousWide,
		})
		placement.lines = layout.lines
		placement.widths.length = layout.lines.length
		for (let i = 0; i < layout.lines.length; i++) {
			placement.widths[i] = stringWidth(layout.lines[i], f.ambiguousWide)
		}
	}
	const n = placement.lines.length
	placement.cols.length = n
	for (let i = 0; i < n; i++) {
		const lw = placement.widths[i]
		placement.cols[i] =
			spec.align === 'start'
				? colStart
				: spec.align === 'end'
					? colStart + widthCells - lw
					: colStart + Math.floor((widthCells - lw) / 2)
	}
	placement.row0 =
		spec.valign === 'start'
			? rowStart
			: spec.valign === 'end'
				? rowStart + heightRows - n
				: rowStart + Math.floor((heightRows - n) / 2)

	entry.label = placement
	entry.labelText = spec.text
	entry.labelCol = colStart
	entry.labelRow = rowStart
	entry.labelW = widthCells
	entry.labelH = heightRows
	entry.labelAlign = spec.align
	entry.labelValign = spec.valign
	return placement
}

function drawPlacement(f: Frame, placement: LabelPlacement, fg: Rgb, bg: Rgb): void {
	const style = bg === -1 ? textStyle : textStyleBg
	style.fg = fadeRgb(fg, f.background, f.opacity)
	if (bg !== -1) style.bg = bg
	style.dim = f.opacity < 1
	const mask = f.textMask
	const clip = f.screen.getClip()
	for (let i = 0; i < placement.lines.length; i++) {
		const line = placement.lines[i]
		if (line.length === 0) continue
		const row = placement.row0 + i
		if (row < clip.y || row >= clip.y + clip.h) continue
		const col = placement.cols[i]
		const used = f.screen.text(col, row, line, style)
		for (let c = col; c < col + used; c++) {
			if (c >= clip.x && c < clip.x + clip.w) mask.set(c, row)
		}
	}
}

function drawLabel(f: Frame, shape: TLShape, entry: ShapeCacheEntry): void {
	const spec = labelSpecScratch
	if (!labelSpec(f, shape, entry, spec)) return
	if (spec.text.length === 0) return
	const placement = placeLabel(f, entry, spec)
	if (placement) drawPlacement(f, placement, spec.fg, spec.bg)
}

// ---- per type -------------------------------------------------------------------------------

function drawGeo(f: Frame, shape: TLGeoShape, entry: ShapeCacheEntry): void {
	const { props } = shape
	applyFill(f, entry, fillLook(f.colors, props.fill, props.color))
	if (setStroke(f, shapeRgb(f.colors, props.color, 'solid'), props)) {
		strokeOutline(f, entry, CURVED_GEOS.has(props.geo) ? 'subcell' : 'auto')
	}
	drawLabel(f, shape, entry)
}

function drawText(f: Frame, shape: TLTextShape, entry: ShapeCacheEntry): void {
	drawLabel(f, shape, entry)
}

function drawNote(f: Frame, shape: TLNoteShape, entry: ShapeCacheEntry): void {
	const { props } = shape
	fillBg(f, collectFillPolys(entry, false), shapeRgb(f.colors, props.color, 'noteFill'))
	if (setStroke(f, paletteRgb(f.colors, 'noteBorder'), {})) strokeOutline(f, entry, 'auto')
	drawLabel(f, shape, entry)
}

function arrowheadGlyph(
	g: GlyphSet,
	kind: TLArrowShapeArrowheadStyle,
	dxCells: number,
	dyCells: number
): string | null {
	// Dominance is decided in screen px: a cell is twice as tall as it is wide.
	const dx = dxCells * CELL_W
	const dy = dyCells * CELL_H
	const horizontal = Math.abs(dx) >= Math.abs(dy)
	switch (kind) {
		case 'none':
			return null
		case 'arrow':
		case 'triangle':
			return horizontal ? (dx >= 0 ? g.arrowRight : g.arrowLeft) : dy >= 0 ? g.arrowDown : g.arrowUp
		case 'inverted':
			return horizontal ? (dx >= 0 ? g.arrowLeft : g.arrowRight) : dy >= 0 ? g.arrowUp : g.arrowDown
		case 'dot':
			return g.dot
		case 'square':
			return g.square
		case 'diamond':
			return g.diamond
		case 'bar':
		case 'pipe':
			return horizontal ? (dx >= 0 ? g.barRight : g.barLeft) : dy >= 0 ? g.barDown : g.barUp
		default:
			return null
	}
}

function drawArrow(f: Frame, shape: TLArrowShape, entry: ShapeCacheEntry): void {
	const info = getArrowInfo(f.editor, shape)
	if (!info || !info.isValid) return
	const { props } = shape
	const body = entry.parts[0]
	if (!body || body.isLabel || body.count < 2) return
	const fg = shapeRgb(f.colors, props.color, 'solid')
	if (setStroke(f, fg, props)) {
		strokePolyline(f.screen, f.raster, body, false, 'auto', lineStyle, cellStyle, null)
		const pts = body.points
		const n = body.count
		const g = f.glyphs
		cellStyle.fg = fadeRgb(fg, f.background, f.opacity)
		const endGlyph = arrowheadGlyph(
			g,
			info.end.arrowhead,
			pts[(n - 1) * 2] - pts[(n - 2) * 2],
			pts[(n - 1) * 2 + 1] - pts[(n - 2) * 2 + 1]
		)
		if (endGlyph) {
			f.screen.put(
				Math.floor(pts[(n - 1) * 2]),
				Math.floor(pts[(n - 1) * 2 + 1]),
				endGlyph,
				cellStyle
			)
		}
		const startGlyph = arrowheadGlyph(g, info.start.arrowhead, pts[0] - pts[2], pts[1] - pts[3])
		if (startGlyph) {
			f.screen.put(Math.floor(pts[0]), Math.floor(pts[1]), startGlyph, cellStyle)
		}
	}
	drawLabel(f, shape, entry)
}

function drawLine(f: Frame, shape: TLShape, entry: ShapeCacheEntry): void {
	const props = shape.props as StrokeProps
	if (setStroke(f, shapeRgb(f.colors, props.color ?? 'black', 'solid'), props)) {
		strokeOutline(f, entry, 'auto')
	}
}

function drawDraw(f: Frame, shape: TLShape, entry: ShapeCacheEntry): void {
	const props = shape.props as StrokeProps & { fill?: TLDefaultFillStyle }
	const color = props.color ?? 'black'
	const part = entry.parts[0]
	const rgb = shapeRgb(f.colors, color, 'solid')
	// A dot: Circle2d smaller than a cell.
	if (part.maxX - part.minX < 1.5 && part.maxY - part.minY < 1.5) {
		cellStyle.fg = fadeRgb(rgb, f.background, f.opacity)
		cellStyle.dim = f.opacity < 1
		f.screen.put(
			Math.floor((part.minX + part.maxX) / 2),
			Math.floor((part.minY + part.maxY) / 2),
			f.glyphs.dot,
			cellStyle
		)
		return
	}
	if (props.fill) applyFill(f, entry, fillLook(f.colors, props.fill, color))
	if (setStroke(f, rgb, props)) strokeOutline(f, entry, 'subcell')
}

function drawHighlight(f: Frame, shape: TLShape, entry: ShapeCacheEntry): void {
	const props = shape.props as { color?: string }
	const rgb = shapeRgb(f.colors, props.color ?? 'yellow', 'highlightSrgb')
	fillBlend(f, collectFillPolys(entry, false), rgb, 0.5 * f.opacity)
}

function drawFrame(f: Frame, shape: TLFrameShape, entry: ShapeCacheEntry): void {
	const colors = f.colors
	fillBg(f, collectFillPolys(entry, false), shapeRgb(colors, 'black', 'frameFill'))
	if (setStroke(f, shapeRgb(colors, 'black', 'frameStroke'), {})) strokeOutline(f, entry, 'auto')
	drawLabel(f, shape, entry)
}

function bboxPolyOf(entry: ShapeCacheEntry): Poly {
	const p = bboxPoly.points
	p[0] = entry.minX
	p[1] = entry.minY
	p[2] = entry.maxX
	p[3] = entry.minY
	p[4] = entry.maxX
	p[5] = entry.maxY
	p[6] = entry.minX
	p[7] = entry.maxY
	p[8] = entry.minX
	p[9] = entry.minY
	return bboxPoly
}

/** Images, videos, embeds, bookmarks and unknown shape types: a dashed box and a `[type]` tag. */
function drawPlaceholder(f: Frame, shape: TLShape, entry: ShapeCacheEntry): void {
	const fg = paletteRgb(f.colors, 'text')
	if (setStroke(f, fg, { dash: 'dashed' })) {
		if (PLACEHOLDER_TYPES.has(shape.type)) {
			strokeOutline(f, entry, 'auto')
		} else {
			strokePolyline(
				f.screen,
				f.raster,
				bboxPolyOf(entry),
				false,
				'auto',
				lineStyle,
				cellStyle,
				null
			)
		}
	}
	const props = shape.props as { altText?: string; url?: string }
	let text = `[${shape.type}]`
	const caption = props.altText || hostOf(props.url)
	if (caption && entry.maxY - entry.minY >= 3) text += `\n${caption}`
	const spec = labelSpecScratch
	spec.text = text
	spec.box.x0 = entry.minX
	spec.box.y0 = entry.minY
	spec.box.x1 = entry.maxX
	spec.box.y1 = entry.maxY
	spec.align = 'center'
	spec.valign = 'center'
	spec.padX = 1
	spec.padY = 1
	spec.fg = fg
	spec.bg = -1
	const placement = placeLabel(f, entry, spec)
	if (placement) drawPlacement(f, placement, fg, -1)
}

function hostOf(url: string | undefined): string {
	if (!url) return ''
	try {
		return new URL(url).host
	} catch {
		return ''
	}
}

// ---- caret ----------------------------------------------------------------------------------

/** Maps a grapheme index in the source text onto the laid-out lines (dropped wrap whitespace
 * and newlines are skipped; a caret past the shown text clamps to the end of the last line). */
export function caretLineAndColumn(
	text: string,
	lines: readonly string[],
	caret: number
): { line: number; column: number } {
	const src = graphemes(text)
	let pos = 0
	for (let i = 0; i < lines.length; i++) {
		const lineG = graphemes(lines[i])
		if (lineG.length > 0) {
			while (pos < src.length && src[pos] !== lineG[0]) pos++
		}
		if (caret < pos) return { line: i, column: 0 }
		let k = 0
		while (k < lineG.length && pos + k < src.length && src[pos + k] === lineG[k]) k++
		if (caret <= pos + k || i === lines.length - 1) {
			return { line: i, column: Math.min(caret - pos, k) }
		}
		pos += k
		if (src[pos] === '\n') pos++
	}
	return { line: 0, column: 0 }
}

/**
 * The terminal cell of the text caret of the shape being edited, laid out exactly like
 * renderShapes draws it (call after renderShapes in the same frame). Null when the shape has no
 * text box on screen.
 */
export function locateCaret(
	editor: Editor,
	screen: Screen,
	canvas: Rect,
	opts: RenderOptions,
	caret: EditCaret
): Cell | null {
	const shape = editor.getShape(caret.shapeId)
	if (!shape) return null
	const f = beginFrame(editor, screen, canvas, opts)
	return unsafe__withoutCapture(() => {
		const entry = ensureEntry(f, shape)
		if (!entry || entry.parts.length === 0) return null
		const spec = labelSpecScratch
		if (!labelSpec(f, shape, entry, spec)) return null
		const placement = placeLabel(f, entry, spec)
		if (!placement) return null
		const { line, column } = caretLineAndColumn(spec.text, placement.lines, caret.caret)
		const lineGraphemes = graphemes(placement.lines[line])
		const offset = stringWidth(lineGraphemes.slice(0, column).join(''), f.ambiguousWide)
		const col = placement.cols[line] + offset
		const row = placement.row0 + line
		if (
			col < canvas.x ||
			col >= canvas.x + canvas.w ||
			row < canvas.y ||
			row >= canvas.y + canvas.h
		) {
			return null
		}
		return { col, row }
	})
}
