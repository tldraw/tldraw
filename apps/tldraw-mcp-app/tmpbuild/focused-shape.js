import { z } from 'zod'
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
export const FocusedFillSchema = z.enum(['none', 'tint', 'background', 'solid', 'pattern'])
export const FocusedSizeSchema = z.enum(['s', 'm', 'l', 'xl'])
export const FocusedFontSchema = z.enum(['draw', 'sans', 'serif', 'mono'])
export const FocusedDashSchema = z.enum(['draw', 'solid', 'dashed', 'dotted'])
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
export const FocusedGeoShapeSchema = z.object({
	_type: FocusedGeoShapeTypeSchema,
	color: FocusedColorSchema,
	dash: FocusedDashSchema.optional(),
	fill: FocusedFillSchema,
	font: FocusedFontSchema.optional(),
	h: z.number(),
	note: z.string().optional(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	text: z.string().optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})
export const FocusedTextShapeSchema = z.object({
	_type: z.literal('text'),
	anchor: FocusedTextAnchorSchema,
	color: FocusedColorSchema,
	font: FocusedFontSchema.optional(),
	fontSize: z.number().optional(),
	maxWidth: z.number().nullable().optional(),
	note: z.string().optional(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	text: z.string(),
	x: z.number(),
	y: z.number(),
})
export const FocusedArrowShapeSchema = z.object({
	_type: z.literal('arrow'),
	bend: z.number().optional(),
	color: FocusedColorSchema,
	dash: FocusedDashSchema.optional(),
	fromId: z.string().nullable().optional(),
	note: z.string().optional(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	text: z.string().optional(),
	toId: z.string().nullable().optional(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
})
export const FocusedLineShapeSchema = z.object({
	_type: z.literal('line'),
	color: FocusedColorSchema,
	dash: FocusedDashSchema.optional(),
	note: z.string().optional(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
})
export const FocusedNoteShapeSchema = z.object({
	_type: z.literal('note'),
	color: FocusedColorSchema,
	font: FocusedFontSchema.optional(),
	note: z.string().optional(),
	shapeId: z.string(),
	size: FocusedSizeSchema.optional(),
	text: z.string().optional(),
	x: z.number(),
	y: z.number(),
})
export const FocusedDrawShapeSchema = z.object({
	_type: z.literal('draw'),
	color: FocusedColorSchema,
	fill: FocusedFillSchema.optional(),
	note: z.string().optional(),
	shapeId: z.string(),
})
export const FocusedFrameShapeSchema = z.object({
	_type: z.literal('frame'),
	children: z.array(z.string()).optional(),
	h: z.number(),
	name: z.string().optional(),
	note: z.string().optional(),
	shapeId: z.string(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})
export const FocusedUnknownShapeSchema = z.object({
	_type: z.literal('unknown'),
	note: z.string().optional(),
	shapeId: z.string(),
	subType: z.string(),
	x: z.number(),
	y: z.number(),
})
const FOCUSED_SHAPES = [
	FocusedGeoShapeSchema,
	FocusedTextShapeSchema,
	FocusedArrowShapeSchema,
	FocusedLineShapeSchema,
	FocusedNoteShapeSchema,
	FocusedDrawShapeSchema,
	FocusedFrameShapeSchema,
	FocusedUnknownShapeSchema,
]
export const FocusedShapeSchema = z.union(FOCUSED_SHAPES)
export const FocusedShapeTypeSchema = z.enum([
	...FocusedGeoShapeTypeSchema.options,
	'text',
	'arrow',
	'line',
	'note',
	'draw',
	'frame',
	'unknown',
])
export const FocusedShapeUpdateSchema = z
	.object({
		shapeId: z.string(),
		_type: FocusedShapeTypeSchema.optional(),
		anchor: FocusedTextAnchorSchema.optional(),
		bend: z.number().optional(),
		children: z.array(z.string()).optional(),
		color: FocusedColorSchema.optional(),
		dash: FocusedDashSchema.optional(),
		fill: FocusedFillSchema.optional(),
		font: FocusedFontSchema.optional(),
		fontSize: z.number().optional(),
		fromId: z.string().nullable().optional(),
		h: z.number().optional(),
		maxWidth: z.number().nullable().optional(),
		name: z.string().optional(),
		note: z.string().optional(),
		size: FocusedSizeSchema.optional(),
		subType: z.string().optional(),
		text: z.string().optional(),
		textAlign: z.enum(['start', 'middle', 'end']).optional(),
		toId: z.string().nullable().optional(),
		w: z.number().optional(),
		x: z.number().optional(),
		x1: z.number().optional(),
		x2: z.number().optional(),
		y: z.number().optional(),
		y1: z.number().optional(),
		y2: z.number().optional(),
	})
	.loose()
const FOCUSED_TO_GEO_TYPES = {
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
const FOCUSED_TO_TLDRAW_FILLS = {
	none: 'none',
	solid: 'lined-fill',
	background: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}
const TLDRAW_TO_FOCUSED_FILLS = {
	none: 'none',
	fill: 'solid',
	'lined-fill': 'solid',
	semi: 'background',
	solid: 'tint',
	pattern: 'pattern',
}
const GEO_TO_FOCUSED_TYPES = Object.fromEntries(
	Object.entries(FOCUSED_TO_GEO_TYPES).map(([focused, tldraw]) => [tldraw, focused])
)
function asColor(color) {
	if (FocusedColorSchema.safeParse(color).success) return color
	if (color === 'pink' || color === 'light-pink') return 'light-violet'
	return 'black'
}
function toShapeId(id) {
	return id.startsWith('shape:') ? id : `shape:${id}`
}
function toSimpleId(id) {
	return id.replace(/^shape:/, '')
}
function toRichText(text) {
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
function fromRichText(richText) {
	if (!richText || typeof richText !== 'object') return ''
	const rt = richText
	return rt.content?.[0]?.content?.[0]?.text ?? ''
}
function getMetaNote(record) {
	const meta = record.meta
	if (meta && typeof meta === 'object' && typeof meta.note === 'string') {
		return meta.note
	}
	return ''
}
function toNumber(value, fallback = 0) {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
export function convertFocusedShapeToTldrawRecord(shape) {
	const base = {
		typeName: 'shape',
		parentId: 'page:page',
		isLocked: false,
		opacity: 1,
		rotation: 0,
		meta: {
			note: shape.note ?? '',
		},
	}
	switch (shape._type) {
		case 'text': {
			let textAlign = 'start'
			if (shape.anchor.includes('center')) textAlign = 'middle'
			if (shape.anchor.includes('right')) textAlign = 'end'
			return {
				...base,
				id: toShapeId(shape.shapeId),
				type: 'text',
				x: shape.x,
				y: shape.y,
				props: {
					richText: toRichText(shape.text),
					color: asColor(shape.color),
					size: shape.size ?? 'm',
					font: shape.font ?? 'draw',
					textAlign,
					autoSize: shape.maxWidth == null,
					w: shape.maxWidth ?? 100,
					scale: 1,
				},
			}
		}
		case 'line': {
			const minX = Math.min(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)
			return {
				...base,
				id: toShapeId(shape.shapeId),
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
		case 'arrow': {
			const minX = Math.min(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)
			return {
				...base,
				id: toShapeId(shape.shapeId),
				type: 'arrow',
				x: minX,
				y: minY,
				meta: {
					note: shape.note ?? '',
					fromId: shape.fromId ?? null,
					toId: shape.toId ?? null,
				},
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
			}
		}
		case 'note': {
			return {
				...base,
				id: toShapeId(shape.shapeId),
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
		case 'draw': {
			return {
				...base,
				id: toShapeId(shape.shapeId),
				type: 'draw',
				x: 0,
				y: 0,
				props: {
					color: asColor(shape.color),
					dash: 'draw',
					size: 's',
					fill: shape.fill ? (FOCUSED_TO_TLDRAW_FILLS[shape.fill] ?? 'none') : 'none',
					segments: [],
					isClosed: false,
					isComplete: true,
					isPen: false,
					scale: 1,
				},
			}
		}
		case 'frame': {
			return {
				...base,
				id: toShapeId(shape.shapeId),
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
		case 'unknown': {
			throw new Error(
				`Cannot create unsupported shape type "${shape.subType}" from FocusedShape unknown.`
			)
		}
		default: {
			const geoType = FOCUSED_TO_GEO_TYPES[shape._type] ?? 'rectangle'
			return {
				...base,
				id: toShapeId(shape.shapeId),
				type: 'geo',
				x: shape.x,
				y: shape.y,
				props: {
					geo: geoType,
					w: shape.w,
					h: shape.h,
					color: asColor(shape.color),
					fill: FOCUSED_TO_TLDRAW_FILLS[shape.fill] ?? 'none',
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
	}
}
export function convertTldrawRecordToFocusedShape(record) {
	const id = typeof record.id === 'string' ? record.id : 'shape:unknown'
	const simpleId = toSimpleId(id)
	const type = typeof record.type === 'string' ? record.type : 'unknown'
	const x = toNumber(record.x)
	const y = toNumber(record.y)
	switch (type) {
		case 'geo': {
			const props = record.props ?? {}
			return {
				_type: GEO_TO_FOCUSED_TYPES[String(props.geo)] ?? 'rectangle',
				shapeId: simpleId,
				x,
				y,
				w: toNumber(props.w, 200),
				h: toNumber(props.h, 100),
				color: asColor(String(props.color ?? 'black')),
				fill: TLDRAW_TO_FOCUSED_FILLS[String(props.fill)] ?? 'none',
				dash: FocusedDashSchema.safeParse(props.dash).success ? props.dash : 'draw',
				size: FocusedSizeSchema.safeParse(props.size).success ? props.size : 'm',
				font: FocusedFontSchema.safeParse(props.font).success ? props.font : 'draw',
				text: fromRichText(props.richText) || undefined,
				textAlign: props.align ?? 'middle',
				note: getMetaNote(record),
			}
		}
		case 'text': {
			const props = record.props ?? {}
			const textAlign = String(props.textAlign ?? 'start')
			const anchor =
				textAlign === 'middle' ? 'top-center' : textAlign === 'end' ? 'top-right' : 'top-left'
			return {
				_type: 'text',
				shapeId: simpleId,
				x,
				y,
				text: fromRichText(props.richText),
				color: asColor(String(props.color ?? 'black')),
				anchor,
				size: FocusedSizeSchema.safeParse(props.size).success ? props.size : 'm',
				font: FocusedFontSchema.safeParse(props.font).success ? props.font : 'draw',
				maxWidth: props.autoSize ? null : toNumber(props.w, 100),
				note: getMetaNote(record),
			}
		}
		case 'arrow': {
			const props = record.props ?? {}
			const start = props.start ?? { x: 0, y: 0 }
			const end = props.end ?? { x: 0, y: 0 }
			const meta = record.meta ?? {}
			return {
				_type: 'arrow',
				shapeId: simpleId,
				x1: x + toNumber(start.x),
				y1: y + toNumber(start.y),
				x2: x + toNumber(end.x),
				y2: y + toNumber(end.y),
				color: asColor(String(props.color ?? 'black')),
				dash: FocusedDashSchema.safeParse(props.dash).success ? props.dash : 'draw',
				size: FocusedSizeSchema.safeParse(props.size).success ? props.size : 'm',
				text: fromRichText(props.richText) || undefined,
				bend: props.bend ? toNumber(props.bend) * -1 : undefined,
				fromId: typeof meta.fromId === 'string' ? meta.fromId : null,
				toId: typeof meta.toId === 'string' ? meta.toId : null,
				note: getMetaNote(record),
			}
		}
		case 'line': {
			const props = record.props ?? {}
			const points = props.points ?? {}
			const a1 = points.a1 ?? { x: 0, y: 0 }
			const a2 = points.a2 ?? { x: 0, y: 0 }
			return {
				_type: 'line',
				shapeId: simpleId,
				x1: x + toNumber(a1.x),
				y1: y + toNumber(a1.y),
				x2: x + toNumber(a2.x),
				y2: y + toNumber(a2.y),
				color: asColor(String(props.color ?? 'black')),
				dash: FocusedDashSchema.safeParse(props.dash).success ? props.dash : 'draw',
				size: FocusedSizeSchema.safeParse(props.size).success ? props.size : 'm',
				note: getMetaNote(record),
			}
		}
		case 'note': {
			const props = record.props ?? {}
			return {
				_type: 'note',
				shapeId: simpleId,
				x,
				y,
				color: asColor(String(props.color ?? 'yellow')),
				size: FocusedSizeSchema.safeParse(props.size).success ? props.size : 'm',
				font: FocusedFontSchema.safeParse(props.font).success ? props.font : 'draw',
				text: fromRichText(props.richText) || undefined,
				note: getMetaNote(record),
			}
		}
		case 'draw': {
			const props = record.props ?? {}
			return {
				_type: 'draw',
				shapeId: simpleId,
				color: asColor(String(props.color ?? 'black')),
				fill: TLDRAW_TO_FOCUSED_FILLS[String(props.fill)] ?? 'none',
				note: getMetaNote(record),
			}
		}
		case 'frame': {
			const props = record.props ?? {}
			return {
				_type: 'frame',
				shapeId: simpleId,
				x,
				y,
				w: toNumber(props.w, 500),
				h: toNumber(props.h, 300),
				name: typeof props.name === 'string' ? props.name : undefined,
				note: getMetaNote(record),
			}
		}
		default:
			return {
				_type: 'unknown',
				shapeId: simpleId,
				subType: type,
				x,
				y,
				note: getMetaNote(record),
			}
	}
}
