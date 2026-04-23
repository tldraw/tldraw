/**
 * Focused shape format types and conversion utilities.
 * Ported from tldraw/tldraw templates/agent/shared/format/
 */
import { TLDefaultFillStyle, TLDefaultSizeStyle, TLGeoShapeGeoStyle, TLShapeId } from 'tldraw'

// ---- Colors ----

export const FOCUSED_COLORS = [
	'red',
	'light-red',
	'green',
	'light-green',
	'blue',
	'light-blue',
	'orange',
	'yellow',
	'black',
	'violet',
	'light-violet',
	'grey',
	'white',
] as const

export type FocusedColor = (typeof FOCUSED_COLORS)[number]

export function asColor(color: string): FocusedColor {
	if (FOCUSED_COLORS.includes(color as FocusedColor)) {
		return color as FocusedColor
	}
	switch (color) {
		case 'pink':
		case 'light-pink':
			return 'light-violet'
	}
	return 'black'
}

// ---- Fill ----

export type FocusedFill = 'none' | 'tint' | 'background' | 'solid' | 'pattern'

const FOCUSED_TO_SHAPE_FILLS: Record<FocusedFill, TLDefaultFillStyle> = {
	none: 'none',
	solid: 'lined-fill',
	background: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

const SHAPE_TO_FOCUSED_FILLS: Record<TLDefaultFillStyle, FocusedFill> = {
	none: 'none',
	fill: 'solid',
	'lined-fill': 'solid',
	semi: 'background',
	solid: 'tint',
	pattern: 'pattern',
}

export function convertFocusedFillToTldrawFill(fill: FocusedFill): TLDefaultFillStyle {
	return FOCUSED_TO_SHAPE_FILLS[fill]
}

export function convertTldrawFillToFocusedFill(fill: TLDefaultFillStyle): FocusedFill {
	return SHAPE_TO_FOCUSED_FILLS[fill]
}

// ---- Font Size ----

const FONT_SIZE_MULTIPLIERS: Record<TLDefaultSizeStyle, number> = {
	s: 1.125,
	m: 1.5,
	l: 2.25,
	xl: 2.75,
}

const DEFAULT_BASE_FONT_SIZE = 16

export function convertFocusedFontSizeToTldrawFontSizeAndScale(
	targetFontSize: number,
	baseFontSize = DEFAULT_BASE_FONT_SIZE
) {
	const fontSizeEntries = Object.entries(FONT_SIZE_MULTIPLIERS)
	let closestSize = fontSizeEntries[0]
	let closestPixelSize = closestSize[1] * baseFontSize
	let minDifference = Math.abs(targetFontSize - closestPixelSize)

	for (const [size, multiplier] of fontSizeEntries) {
		const pixelSize = multiplier * baseFontSize
		const difference = Math.abs(targetFontSize - pixelSize)
		if (difference < minDifference) {
			minDifference = difference
			closestSize = [size, multiplier]
			closestPixelSize = pixelSize
		}
	}

	const textSize = closestSize[0] as TLDefaultSizeStyle
	const scale = targetFontSize / closestPixelSize

	return { textSize, scale }
}

export function convertTldrawFontSizeAndScaleToFocusedFontSize(
	textSize: TLDefaultSizeStyle,
	scale: number,
	baseFontSize = DEFAULT_BASE_FONT_SIZE
) {
	return Math.round(FONT_SIZE_MULTIPLIERS[textSize] * baseFontSize * scale)
}

// ---- Geo Shape Types ----

export type FocusedGeoShapeType =
	| 'rectangle'
	| 'ellipse'
	| 'triangle'
	| 'diamond'
	| 'hexagon'
	| 'pill'
	| 'cloud'
	| 'x-box'
	| 'check-box'
	| 'heart'
	| 'pentagon'
	| 'octagon'
	| 'star'
	| 'parallelogram-right'
	| 'parallelogram-left'
	| 'trapezoid'
	| 'fat-arrow-right'
	| 'fat-arrow-left'
	| 'fat-arrow-up'
	| 'fat-arrow-down'

export const FOCUSED_TO_GEO_TYPES: Record<FocusedGeoShapeType, TLGeoShapeGeoStyle> = {
	rectangle: 'rectangle',
	ellipse: 'ellipse',
	triangle: 'triangle',
	diamond: 'diamond',
	hexagon: 'hexagon',
	pill: 'oval',
	cloud: 'cloud',
	'x-box': 'x-box',
	'check-box': 'check-box',
	heart: 'heart',
	pentagon: 'pentagon',
	octagon: 'octagon',
	star: 'star',
	'parallelogram-right': 'rhombus',
	'parallelogram-left': 'rhombus-2',
	trapezoid: 'trapezoid',
	'fat-arrow-right': 'arrow-right',
	'fat-arrow-left': 'arrow-left',
	'fat-arrow-up': 'arrow-up',
	'fat-arrow-down': 'arrow-down',
} as const

export const GEO_TO_FOCUSED_TYPES: Record<TLGeoShapeGeoStyle, FocusedGeoShapeType> = {
	rectangle: 'rectangle',
	ellipse: 'ellipse',
	triangle: 'triangle',
	diamond: 'diamond',
	hexagon: 'hexagon',
	oval: 'pill',
	cloud: 'cloud',
	'x-box': 'x-box',
	'check-box': 'check-box',
	heart: 'heart',
	pentagon: 'pentagon',
	octagon: 'octagon',
	star: 'star',
	rhombus: 'parallelogram-right',
	'rhombus-2': 'parallelogram-left',
	trapezoid: 'trapezoid',
	'arrow-right': 'fat-arrow-right',
	'arrow-left': 'fat-arrow-left',
	'arrow-up': 'fat-arrow-up',
	'arrow-down': 'fat-arrow-down',
} as const

// ---- ID Conversion ----

export function convertSimpleIdToTldrawId(id: string): TLShapeId {
	if (id.startsWith('shape:')) return id as TLShapeId
	return ('shape:' + id) as TLShapeId
}

export function convertTldrawIdToSimpleId(id: TLShapeId): string {
	return id.slice(6)
}

// ---- Text Anchor ----

export type FocusedTextAnchor =
	| 'bottom-center'
	| 'bottom-left'
	| 'bottom-right'
	| 'center-left'
	| 'center-right'
	| 'center'
	| 'top-center'
	| 'top-left'
	| 'top-right'

// ---- Focused Shape Types ----

/**
 * Geometric shapes like rectangles, ellipses, triangles, and other predefined forms.
 * The _type field determines the geometric form.
 */
export interface FocusedGeoShape {
	/** Geometric shape type */
	_type: FocusedGeoShapeType
	/** Shape color */
	color: FocusedColor
	/** Fill style */
	fill: FocusedFill
	/** Height in pixels */
	h: number
	/** Metadata note */
	note: string
	/** Unique shape identifier */
	shapeId: string
	/** Text label inside the shape */
	text?: string
	/** Text alignment */
	textAlign?: 'start' | 'middle' | 'end'
	/** Width in pixels */
	w: number
	/** X position */
	x: number
	/** Y position */
	y: number
}

/** A straight line between two points. */
export interface FocusedLineShape {
	/** Always 'line' */
	_type: 'line'
	/** Line color */
	color: FocusedColor
	/** Metadata note */
	note: string
	/** Unique shape identifier */
	shapeId: string
	/** Start X */
	x1: number
	/** End X */
	x2: number
	/** Start Y */
	y1: number
	/** End Y */
	y2: number
}

/** A sticky note. */
export interface FocusedNoteShape {
	/** Always 'note' */
	_type: 'note'
	/** Note color */
	color: FocusedColor
	/** Metadata note */
	note: string
	/** Unique shape identifier */
	shapeId: string
	/** Note text content */
	text?: string
	/** X position */
	x: number
	/** Y position */
	y: number
}

/** A text shape for placing text on the canvas. */
export interface FocusedTextShape {
	/** Always 'text' */
	_type: 'text'
	/** Where the (x,y) point anchors on the text bounding box */
	anchor: FocusedTextAnchor
	/** Text color */
	color: FocusedColor
	/** Font size in pixels */
	fontSize?: number
	/** Max width before wrapping (null = auto-size) */
	maxWidth: number | null
	/** Metadata note */
	note: string
	/** Unique shape identifier */
	shapeId: string
	/** Text content */
	text: string
	/** X position */
	x: number
	/** Y position */
	y: number
}

/** An arrow connecting two points or shapes. Use fromId/toId to bind to shapes. */
export interface FocusedArrowShape {
	/** Always 'arrow' */
	_type: 'arrow'
	/** Arrow color */
	color: FocusedColor
	/** Shape ID to bind the arrow start to */
	fromId: string | null
	/** Metadata note */
	note: string
	/** Unique shape identifier */
	shapeId: string
	/** Arrow label text */
	text?: string
	/** Shape ID to bind the arrow end to */
	toId: string | null
	/** Start X */
	x1: number
	/** End X */
	x2: number
	/** Start Y */
	y1: number
	/** End Y */
	y2: number
	/** Signed bend amount for the curve */
	bend?: number
	/** Arrow routing style */
	kind?: 'arc' | 'elbow'
}

/** A freehand drawing. */
export interface FocusedDrawShape {
	/** Always 'draw' */
	_type: 'draw'
	/** Stroke color */
	color: FocusedColor
	/** Fill style */
	fill?: FocusedFill
	/** Metadata note */
	note: string
	/** Unique shape identifier */
	shapeId: string
}

/** Fallback for unsupported shape types. */
export interface FocusedUnknownShape {
	/** Always 'unknown' */
	_type: 'unknown'
	/** Metadata note */
	note: string
	/** Unique shape identifier */
	shapeId: string
	/** Original tldraw shape type */
	subType: string
	/** X position */
	x: number
	/** Y position */
	y: number
}

export type FocusedShape =
	| FocusedGeoShape
	| FocusedLineShape
	| FocusedNoteShape
	| FocusedTextShape
	| FocusedArrowShape
	| FocusedDrawShape
	| FocusedUnknownShape
