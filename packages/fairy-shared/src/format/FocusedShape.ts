import { z } from 'zod'
import { FocusColorSchema } from './FocusColor'
import { FocusFillSchema } from './FocusFill'
import { FocusFontSizeSchema } from './FocusFontSize'

const FocusedLabelSchema = z.string()

export const FocusedGeoTypeSchema = z.enum([
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
])

export type FocusedGeoType = z.infer<typeof FocusedGeoTypeSchema>

export const FocusedGeoShapeSchema = z.object({
	_type: FocusedGeoTypeSchema,
	color: FocusColorSchema,
	fill: FocusFillSchema,
	h: z.number(),
	note: z.string(),
	shapeId: z.string(),
	text: FocusedLabelSchema.optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

export type FocusedGeoShape = z.infer<typeof FocusedGeoShapeSchema>

export const FocusedLineShapeSchema = z.object({
	_type: z.literal('line'),
	color: FocusColorSchema,
	note: z.string(),
	shapeId: z.string(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
})

export type FocusedLineShape = z.infer<typeof FocusedLineShapeSchema>

export const FocusedNoteShapeSchema = z.object({
	_type: z.literal('note'),
	color: FocusColorSchema,
	note: z.string(),
	shapeId: z.string(),
	text: FocusedLabelSchema.optional(),
	x: z.number(),
	y: z.number(),
})

export type FocusedNoteShape = z.infer<typeof FocusedNoteShapeSchema>

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

const FocusedTextShapeSchema = z
	.object({
		_type: z.literal('text'),
		anchor: FocusedTextAnchorSchema,
		color: FocusColorSchema,
		fontSize: FocusFontSizeSchema.optional(),
		note: z.string(),
		shapeId: z.string(),
		text: FocusedLabelSchema,
		width: z.number().optional(),
		wrap: z.boolean().optional(),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Text Shape',
		description:
			'A text shape is a shape that contains text. The `anchor` property indicates how the text shape is positioned and aligned. For example, the "top-left" anchor means the text shape\'s x and y coordinates are the top left corner of the text shape, and the text gets left aligned. A shape with the "bottom-center" anchor means the text shape\'s x and y coordinates are the bottom center of the text shape, and the text gets center aligned on the horizontal axis. If `wrap` is set to true, the text will automatically wrap text to the next line if it exceeds the width of the shape (there is no need to add manual line breaks for word wrapping if `wrap` is enabled).',
	})

export type FocusedTextShape = z.infer<typeof FocusedTextShapeSchema>

export const FocusedArrowShapeSchema = z.object({
	_type: z.literal('arrow'),
	color: FocusColorSchema,
	fromId: z.string().nullable(),
	note: z.string(),
	shapeId: z.string(),
	text: z.string().optional(),
	toId: z.string().nullable(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
	bend: z.number().optional(),
})

export type FocusedArrowShape = z.infer<typeof FocusedArrowShapeSchema>

const FocusedDrawShapeSchema = z
	.object({
		_type: z.literal('draw'),
		color: FocusColorSchema,
		fill: FocusFillSchema.optional(),
		note: z.string(),
		shapeId: z.string(),
	})
	.meta({
		title: 'Draw Shape',
		description:
			'A draw shape is a freeform shape that was drawn by the pen tool. IMPORTANT: Do not create draw shapes with the "create" action. To create new draw shapes, the AI must use the pen event because it gives more control.',
	})

export type FocusedDrawShape = z.infer<typeof FocusedDrawShapeSchema>

const FocusedUnknownShapeSchema = z
	.object({
		_type: z.literal('unknown'),
		note: z.string(),
		shapeId: z.string(),
		subType: z.string(),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Unknown Shape',
		description:
			"A special shape that is not represented by one of the canvas's core shape types. The AI cannot create these shapes, but it *can* interact with them. eg: The AI can move these shapes. The `subType` property contains the internal name of the shape's type.",
	})

export type FocusedUnknownShape = z.infer<typeof FocusedUnknownShapeSchema>

const FOCUSED_SHAPES_SCHEMAS = [
	FocusedDrawShapeSchema,
	FocusedGeoShapeSchema,
	FocusedLineShapeSchema,
	FocusedTextShapeSchema,
	FocusedArrowShapeSchema,
	FocusedNoteShapeSchema,
	FocusedUnknownShapeSchema,
] as const
export const FocusedShapeSchema = z.union(FOCUSED_SHAPES_SCHEMAS)
export const FocusedShapePartialSchema = z.union(
	FOCUSED_SHAPES_SCHEMAS.map((schema) => schema.partial())
)
export type FocusedShape = z.infer<typeof FocusedShapeSchema>
export type FocusedShapePartial = z.infer<typeof FocusedShapePartialSchema>
/**
 * Extract all shape type names from the schema
 */
function getFocusedShapeTypes() {
	const typeNames: FocusedShape['_type'][] = []

	for (const shapeSchema of FOCUSED_SHAPES_SCHEMAS) {
		const typeField = shapeSchema.shape._type

		if (typeField) {
			// Handle ZodLiterals (like FocusedDrawShape)
			if ('value' in typeField && typeof typeField.value === 'string') {
				typeNames.push(typeField.value)
			}
			// Handle ZodEnums (like FocusedGeoShape)
			else if ('options' in typeField && Array.isArray(typeField.options)) {
				typeNames.push(...typeField.options)
			}
		}
	}

	return typeNames
}

export const FOCUSED_SHAPE_TYPES = getFocusedShapeTypes()
export const FocusedShapeTypeSchema = z.union(FOCUSED_SHAPE_TYPES.map((name) => z.literal(name)))
export type FocusedShapeType = z.infer<typeof FocusedShapeTypeSchema>
