import { z } from 'zod'

const FocusedColorValueSchema = z.enum([
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

const FOCUSED_COLOR_ALIASES: Record<string, z.infer<typeof FocusedColorValueSchema>> = {
	'light-orange': 'yellow',
	brown: 'orange',
	pink: 'light-violet',
	purple: 'violet',
	'light-pink': 'light-violet',
}

export const FocusedColorSchema = z.preprocess((value) => {
	if (typeof value !== 'string') return value
	const normalized = value.trim().toLowerCase()
	return FOCUSED_COLOR_ALIASES[normalized] ?? normalized
}, FocusedColorValueSchema)

export type FocusedColor = z.infer<typeof FocusedColorValueSchema>

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

export type FocusedGeoShape = z.infer<typeof FocusedGeoShapeSchema>

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

export type FocusedTextShape = z.infer<typeof FocusedTextShapeSchema>

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

export type FocusedArrowShape = z.infer<typeof FocusedArrowShapeSchema>

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

export type FocusedLineShape = z.infer<typeof FocusedLineShapeSchema>

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

export type FocusedNoteShape = z.infer<typeof FocusedNoteShapeSchema>

export const FocusedDrawShapeSchema = z.object({
	_type: z.literal('draw'),
	color: FocusedColorSchema,
	fill: FocusedFillSchema.optional(),
	note: z.string().optional(),
	shapeId: z.string(),
})

export type FocusedDrawShape = z.infer<typeof FocusedDrawShapeSchema>

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

export type FocusedFrameShape = z.infer<typeof FocusedFrameShapeSchema>

export const FocusedUnknownShapeSchema = z.object({
	_type: z.literal('unknown'),
	note: z.string().optional(),
	shapeId: z.string(),
	subType: z.string(),
	x: z.number(),
	y: z.number(),
})

export type FocusedUnknownShape = z.infer<typeof FocusedUnknownShapeSchema>

const FOCUSED_SHAPES = [
	FocusedGeoShapeSchema,
	FocusedTextShapeSchema,
	FocusedArrowShapeSchema,
	FocusedLineShapeSchema,
	FocusedNoteShapeSchema,
	FocusedDrawShapeSchema,
	FocusedFrameShapeSchema,
	FocusedUnknownShapeSchema,
] as const
export const FocusedShapeSchema = z.union(FOCUSED_SHAPES)

export type FocusedShape = z.infer<typeof FocusedShapeSchema>

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

export type FocusedShapeUpdate = z.infer<typeof FocusedShapeUpdateSchema>
