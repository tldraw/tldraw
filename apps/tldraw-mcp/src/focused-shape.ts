/**
 * FocusedShape types, Zod schemas, and headless conversion to tldraw records.
 * Adapted from templates/agent/shared/format/ — self-contained with no workspace imports.
 */

import { z } from 'zod'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const FocusedColorSchema = z.enum([
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
])

export type FocusedColor = z.infer<typeof FocusedColorSchema>

export const FocusedFillSchema = z.enum(['none', 'tint', 'background', 'solid', 'pattern'])
export type FocusedFill = z.infer<typeof FocusedFillSchema>

export const FocusedSizeSchema = z.enum(['s', 'm', 'l', 'xl'])
export type FocusedSize = z.infer<typeof FocusedSizeSchema>

export const FocusedFontSchema = z.enum(['draw', 'sans', 'serif', 'mono'])
export type FocusedFont = z.infer<typeof FocusedFontSchema>

export const FocusedDashSchema = z.enum(['draw', 'solid', 'dashed', 'dotted'])
export type FocusedDash = z.infer<typeof FocusedDashSchema>

export const FocusedGeoShapeTypeSchema = z.enum([
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'hexagon',
	'pill',
	'cloud',
	'x-box',
	'check-box',
	'heart',
	'pentagon',
	'octagon',
	'star',
	'parallelogram-right',
	'parallelogram-left',
	'trapezoid',
	'fat-arrow-right',
	'fat-arrow-left',
	'fat-arrow-up',
	'fat-arrow-down',
	'geo',
])
export type FocusedGeoShapeType = z.infer<typeof FocusedGeoShapeTypeSchema>

export const FocusedTextAnchorSchema = z.enum([
	'bottom-center',
	'bottom-left',
	'bottom-right',
	'center-left',
	'center-right',
	'center',
	'top-center',
	'top-left',
	'top-right',
])
export type FocusedTextAnchor = z.infer<typeof FocusedTextAnchorSchema>

// ─── Shape schemas ────────────────────────────────────────────────────────────

export const FocusedGeoShapeSchema = z.object({
	_type: FocusedGeoShapeTypeSchema,
	color: FocusedColorSchema,
	dash: FocusedDashSchema.optional(),
	fill: FocusedFillSchema,
	font: FocusedFontSchema.optional(),
	h: z.number(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	text: z.string().optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})
export type FocusedGeoShape = z.infer<typeof FocusedGeoShapeSchema>

export const FocusedTextShapeSchema = z.object({
	_type: z.literal('text'),
	anchor: FocusedTextAnchorSchema,
	color: FocusedColorSchema,
	font: FocusedFontSchema.optional(),
	maxWidth: z.number().nullable().optional(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	text: z.string(),
	x: z.number(),
	y: z.number(),
})
export type FocusedTextShape = z.infer<typeof FocusedTextShapeSchema>

export const FocusedArrowShapeSchema = z.object({
	_type: z.literal('arrow'),
	color: FocusedColorSchema,
	dash: FocusedDashSchema.optional(),
	fromId: z.string().nullable().optional(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	text: z.string().optional(),
	toId: z.string().nullable().optional(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
	bend: z.number().optional(),
})
export type FocusedArrowShape = z.infer<typeof FocusedArrowShapeSchema>

export const FocusedLineShapeSchema = z.object({
	_type: z.literal('line'),
	color: FocusedColorSchema,
	dash: FocusedDashSchema.optional(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
})
export type FocusedLineShape = z.infer<typeof FocusedLineShapeSchema>

export const FocusedNoteShapeSchema = z.object({
	_type: z.literal('note'),
	color: FocusedColorSchema,
	font: FocusedFontSchema.optional(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	text: z.string().optional(),
	x: z.number(),
	y: z.number(),
})
export type FocusedNoteShape = z.infer<typeof FocusedNoteShapeSchema>

export const FocusedDrawShapeSchema = z.object({
	_type: z.literal('draw'),
	color: FocusedColorSchema,
	fill: FocusedFillSchema.optional(),
	shapeId: z.string(),
})
export type FocusedDrawShape = z.infer<typeof FocusedDrawShapeSchema>

export const FocusedFrameShapeSchema = z.object({
	_type: z.literal('frame'),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
	name: z.string().optional(),
	children: z.array(z.string()).optional(),
})
export type FocusedFrameShape = z.infer<typeof FocusedFrameShapeSchema>

export const FocusedShapeSchema = z.union([
	FocusedGeoShapeSchema,
	FocusedTextShapeSchema,
	FocusedArrowShapeSchema,
	FocusedLineShapeSchema,
	FocusedNoteShapeSchema,
	FocusedDrawShapeSchema,
	FocusedFrameShapeSchema,
])
export type FocusedShape = z.infer<typeof FocusedShapeSchema>

// ─── Conversion mappings ──────────────────────────────────────────────────────

const FOCUSED_TO_GEO_TYPES: Record<FocusedGeoShapeType, string> = {
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
	geo: 'rectangle',
}

const FOCUSED_TO_TLDRAW_FILLS: Record<FocusedFill, string> = {
	none: 'none',
	solid: 'lined-fill',
	background: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

function asColor(color: string): string {
	if (FocusedColorSchema.safeParse(color).success) {
		return color
	}
	switch (color) {
		case 'pink':
		case 'light-pink':
			return 'light-violet'
	}
	return 'black'
}

// ─── Rich text helper ─────────────────────────────────────────────────────────

function toRichText(text: string): { type: string; content: unknown[] } {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: text ? [{ type: 'text', text }] : [],
			},
		],
	}
}

// ─── Tldraw record type ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TldrawRecord = Record<string, any>

export interface BindingInfo {
	arrowShapeId: string
	targetShapeId: string
	terminal: 'start' | 'end'
}

export interface ConversionResult {
	record: TldrawRecord
	bindings: BindingInfo[]
}

// ─── Headless conversion ──────────────────────────────────────────────────────

/** Convert a FocusedShape to a tldraw shape record (headless, no Editor needed). */
export function convertFocusedShapeToTldrawRecord(
	shape: FocusedShape,
	index: number
): ConversionResult {
	const indexStr = `a${(index + 1).toString()}`
	const bindings: BindingInfo[] = []

	const base = {
		typeName: 'shape' as const,
		parentId: 'page:page',
		index: indexStr,
		isLocked: false,
		opacity: 1,
		rotation: 0,
		meta: {},
	}

	switch (shape._type) {
		case 'text':
			return { record: convertText(shape, base), bindings }
		case 'line':
			return { record: convertLine(shape, base), bindings }
		case 'arrow':
			return convertArrow(shape, base)
		case 'note':
			return { record: convertNote(shape, base), bindings }
		case 'draw':
			return { record: convertDraw(shape, base), bindings }
		case 'frame':
			return { record: convertFrame(shape, base), bindings }
		default:
			// Geo shape (rectangle, ellipse, etc.)
			return { record: convertGeo(shape, base), bindings }
	}
}

function convertGeo(shape: FocusedGeoShape, base: TldrawRecord): TldrawRecord {
	const geoType = FOCUSED_TO_GEO_TYPES[shape._type] ?? 'rectangle'
	const fill = FOCUSED_TO_TLDRAW_FILLS[shape.fill] ?? 'none'

	return {
		...base,
		id: `shape:${shape.shapeId}`,
		type: 'geo',
		x: shape.x,
		y: shape.y,
		props: {
			geo: geoType,
			w: shape.w,
			h: shape.h,
			color: asColor(shape.color),
			fill,
			dash: shape.dash ?? 'draw',
			size: shape.size ?? 'm',
			font: shape.font ?? 'draw',
			align: shape.textAlign ?? 'middle',
			verticalAlign: 'middle',
			growY: 0,
			richText: toRichText(shape.text ?? ''),
			labelColor: 'black',
			scale: 1,
			url: '',
		},
	}
}

function convertText(shape: FocusedTextShape, base: TldrawRecord): TldrawRecord {
	let textAlign: string = 'start'
	switch (shape.anchor) {
		case 'top-left':
		case 'bottom-left':
		case 'center-left':
			textAlign = 'start'
			break
		case 'top-center':
		case 'bottom-center':
		case 'center':
			textAlign = 'middle'
			break
		case 'top-right':
		case 'bottom-right':
		case 'center-right':
			textAlign = 'end'
			break
	}

	const autoSize = shape.maxWidth == null
	const w = shape.maxWidth ?? 100

	return {
		...base,
		id: `shape:${shape.shapeId}`,
		type: 'text',
		x: shape.x,
		y: shape.y,
		props: {
			richText: toRichText(shape.text),
			color: asColor(shape.color),
			size: shape.size ?? 'm',
			font: shape.font ?? 'draw',
			textAlign,
			autoSize,
			w,
			scale: 1,
		},
	}
}

function convertLine(shape: FocusedLineShape, base: TldrawRecord): TldrawRecord {
	const minX = Math.min(shape.x1, shape.x2)
	const minY = Math.min(shape.y1, shape.y2)

	return {
		...base,
		id: `shape:${shape.shapeId}`,
		type: 'line',
		x: minX,
		y: minY,
		props: {
			color: asColor(shape.color),
			dash: shape.dash ?? 'draw',
			size: shape.size ?? 'm',
			scale: 1,
			spline: 'line',
			points: {
				a1: { id: 'a1', index: 'a1', x: shape.x1 - minX, y: shape.y1 - minY },
				a2: { id: 'a2', index: 'a2', x: shape.x2 - minX, y: shape.y2 - minY },
			},
		},
	}
}

function convertArrow(shape: FocusedArrowShape, base: TldrawRecord): ConversionResult {
	const minX = Math.min(shape.x1, shape.x2)
	const minY = Math.min(shape.y1, shape.y2)
	const shapeId = `shape:${shape.shapeId}`

	const bindings: BindingInfo[] = []

	if (shape.fromId) {
		bindings.push({
			arrowShapeId: shapeId,
			targetShapeId: `shape:${shape.fromId}`,
			terminal: 'start',
		})
	}
	if (shape.toId) {
		bindings.push({
			arrowShapeId: shapeId,
			targetShapeId: `shape:${shape.toId}`,
			terminal: 'end',
		})
	}

	return {
		record: {
			...base,
			id: shapeId,
			type: 'arrow',
			x: minX,
			y: minY,
			props: {
				color: asColor(shape.color),
				dash: shape.dash ?? 'draw',
				size: shape.size ?? 'm',
				fill: 'none',
				font: 'draw',
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
				start: { x: shape.x1 - minX, y: shape.y1 - minY },
				end: { x: shape.x2 - minX, y: shape.y2 - minY },
				bend: (shape.bend ?? 0) * -1,
				richText: toRichText(shape.text ?? ''),
				labelColor: 'black',
				labelPosition: 0.5,
				scale: 1,
				kind: 'arc',
				elbowMidPoint: 0.5,
			},
		},
		bindings,
	}
}

function convertNote(shape: FocusedNoteShape, base: TldrawRecord): TldrawRecord {
	return {
		...base,
		id: `shape:${shape.shapeId}`,
		type: 'note',
		x: shape.x,
		y: shape.y,
		props: {
			color: asColor(shape.color),
			richText: toRichText(shape.text ?? ''),
			size: shape.size ?? 'm',
			font: shape.font ?? 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			fontSizeAdjustment: 0,
			growY: 0,
			labelColor: 'black',
			scale: 1,
			url: '',
		},
	}
}

function convertFrame(shape: FocusedFrameShape, base: TldrawRecord): TldrawRecord {
	return {
		...base,
		id: `shape:${shape.shapeId}`,
		type: 'frame',
		x: shape.x,
		y: shape.y,
		props: {
			w: shape.w,
			h: shape.h,
			name: shape.name ?? '',
		},
	}
}

// ─── Reverse conversion mappings ──────────────────────────────────────────────

const GEO_TO_FOCUSED_TYPES: Record<string, FocusedGeoShapeType> = Object.fromEntries(
	Object.entries(FOCUSED_TO_GEO_TYPES).map(([k, v]) => [v, k as FocusedGeoShapeType])
)

const TLDRAW_TO_FOCUSED_FILLS: Record<string, FocusedFill> = Object.fromEntries(
	Object.entries(FOCUSED_TO_TLDRAW_FILLS).map(([k, v]) => [v, k as FocusedFill])
)

/** Extract plain text from tldraw richText format. */
function fromRichText(richText: unknown): string {
	if (!richText || typeof richText !== 'object') return ''
	const rt = richText as { content?: { content?: { text?: string }[] }[] }
	return rt.content?.[0]?.content?.[0]?.text ?? ''
}

/** Convert a tldraw shape record back to FocusedShape format. Returns null for unsupported types. */
export function convertTldrawRecordToFocusedShape(
	record: TldrawRecord,
	simpleId: string
): FocusedShape | null {
	switch (record.type) {
		case 'geo': {
			const geoType = GEO_TO_FOCUSED_TYPES[record.props?.geo] ?? 'rectangle'
			const fill = TLDRAW_TO_FOCUSED_FILLS[record.props?.fill] ?? 'none'
			return {
				_type: geoType,
				shapeId: simpleId,
				x: record.x ?? 0,
				y: record.y ?? 0,
				w: record.props?.w ?? 200,
				h: record.props?.h ?? 100,
				color: (record.props?.color ?? 'black') as FocusedColor,
				fill: fill as FocusedFill,
				dash: (record.props?.dash ?? 'draw') as FocusedDash,
				size: (record.props?.size ?? 'm') as FocusedSize,
				font: (record.props?.font ?? 'draw') as FocusedFont,
				text: fromRichText(record.props?.richText) || undefined,
				textAlign: record.props?.align as 'start' | 'middle' | 'end' | undefined,
			}
		}
		case 'text': {
			const textAlign = record.props?.textAlign ?? 'start'
			let anchor: FocusedTextAnchor = 'top-left'
			if (textAlign === 'middle') anchor = 'top-center'
			else if (textAlign === 'end') anchor = 'top-right'
			return {
				_type: 'text',
				shapeId: simpleId,
				x: record.x ?? 0,
				y: record.y ?? 0,
				text: fromRichText(record.props?.richText),
				color: (record.props?.color ?? 'black') as FocusedColor,
				anchor,
				size: (record.props?.size ?? 'm') as FocusedSize,
				font: (record.props?.font ?? 'draw') as FocusedFont,
				maxWidth: record.props?.autoSize ? null : (record.props?.w ?? null),
			}
		}
		case 'arrow': {
			const ax = record.x ?? 0
			const ay = record.y ?? 0
			const start = record.props?.start ?? { x: 0, y: 0 }
			const end = record.props?.end ?? { x: 0, y: 0 }
			return {
				_type: 'arrow',
				shapeId: simpleId,
				x1: ax + start.x,
				y1: ay + start.y,
				x2: ax + end.x,
				y2: ay + end.y,
				color: (record.props?.color ?? 'black') as FocusedColor,
				dash: (record.props?.dash ?? 'draw') as FocusedDash,
				size: (record.props?.size ?? 'm') as FocusedSize,
				text: fromRichText(record.props?.richText) || undefined,
				bend: record.props?.bend ? (record.props.bend as number) * -1 : undefined,
			}
		}
		case 'line': {
			const lx = record.x ?? 0
			const ly = record.y ?? 0
			const pts = record.props?.points ?? {}
			const a1 = pts.a1 ?? { x: 0, y: 0 }
			const a2 = pts.a2 ?? { x: 0, y: 0 }
			return {
				_type: 'line',
				shapeId: simpleId,
				x1: lx + a1.x,
				y1: ly + a1.y,
				x2: lx + a2.x,
				y2: ly + a2.y,
				color: (record.props?.color ?? 'black') as FocusedColor,
				dash: (record.props?.dash ?? 'draw') as FocusedDash,
				size: (record.props?.size ?? 'm') as FocusedSize,
			}
		}
		case 'note':
			return {
				_type: 'note',
				shapeId: simpleId,
				x: record.x ?? 0,
				y: record.y ?? 0,
				color: (record.props?.color ?? 'yellow') as FocusedColor,
				size: (record.props?.size ?? 'm') as FocusedSize,
				font: (record.props?.font ?? 'draw') as FocusedFont,
				text: fromRichText(record.props?.richText) || undefined,
			}
		case 'draw':
			return {
				_type: 'draw',
				shapeId: simpleId,
				color: (record.props?.color ?? 'black') as FocusedColor,
				fill: (TLDRAW_TO_FOCUSED_FILLS[record.props?.fill] ?? 'none') as FocusedFill,
			}
		case 'frame':
			return {
				_type: 'frame',
				shapeId: simpleId,
				x: record.x ?? 0,
				y: record.y ?? 0,
				w: record.props?.w ?? 500,
				h: record.props?.h ?? 300,
				name: record.props?.name || undefined,
			} as FocusedShape
		default:
			return null
	}
}

function convertDraw(shape: FocusedDrawShape, base: TldrawRecord): TldrawRecord {
	const fill = shape.fill ? (FOCUSED_TO_TLDRAW_FILLS[shape.fill] ?? 'none') : 'none'

	return {
		...base,
		id: `shape:${shape.shapeId}`,
		type: 'draw',
		x: 0,
		y: 0,
		props: {
			color: asColor(shape.color),
			dash: 'draw',
			size: 's',
			fill,
			segments: [],
			isClosed: false,
			isComplete: true,
			isPen: false,
			scale: 1,
		},
	}
}
