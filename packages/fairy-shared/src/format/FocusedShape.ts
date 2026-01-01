import { z } from 'zod'
import { SimpleShapeId, SimpleShapeIdSchema } from '../schema/id-schemas'
import { FocusColorSchema } from './FocusColor'
import { FocusFillSchema } from './FocusFill'
import { FocusFontSizeSchema } from './FocusFontSize'

/**
 * A shape ID used in agent actions and focused shapes.
 * This is a plain string (e.g. "myshape"), not a TLShapeId (which has the "shape:" prefix).
 */
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
	shapeId: SimpleShapeIdSchema,
	text: z.string().optional(),
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
	shapeId: SimpleShapeIdSchema,
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
	shapeId: SimpleShapeIdSchema,
	text: z.string().optional(),
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
		maxWidth: z.number().nullable(),
		note: z.string(),
		shapeId: SimpleShapeIdSchema,
		text: z.string(),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Text Shape',
		description:
			'A text shape is a shape that contains text. The `anchor` property indicates how the text shape is positioned and aligned. For example, the "top-left" anchor means the text shape\'s x and y coordinates are the top left corner of the text shape, and the text gets left aligned. A shape with the "bottom-center" anchor means the text shape\'s x and y coordinates are the bottom center of the text shape, and the text gets center aligned on the horizontal axis. By default, text shapes auto-size to fit their content. If you provide a `maxWidth`, the text will automatically wrap to the next line if it exceeds that width (there is no need to add manual line breaks for word wrapping).',
	})

export type FocusedTextShape = z.infer<typeof FocusedTextShapeSchema>

export const FocusedArrowShapeSchema = z.object({
	_type: z.literal('arrow'),
	color: FocusColorSchema,
	fromId: SimpleShapeIdSchema.nullable(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: z.string().optional(),
	toId: SimpleShapeIdSchema.nullable(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
	bend: z.number().optional(),
})

export type FocusedArrowShape = z.infer<typeof FocusedArrowShapeSchema>

const FocusedDrawShapeSchema = z
	.object({
		_type: z.literal('pen'),
		color: FocusColorSchema,
		fill: FocusFillSchema.optional(),
		note: z.string(),
		shapeId: SimpleShapeIdSchema,
	})
	.meta({
		title: 'Draw Shape',
		description:
			'A draw shape is a freeform shape that was drawn by the pen tool. IMPORTANT: Do not create draw shapes with the "create" action. To create new draw shapes, the AI must use the pen event because it gives more control.',
	})

export type FocusedDrawShape = z.infer<typeof FocusedDrawShapeSchema>

const FocusedImageShapeSchema = z.object({
	_type: z.literal('image'),
	altText: z.string(),
	h: z.number(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

export type FocusedImageShape = z.infer<typeof FocusedImageShapeSchema>

const FocusedUnknownShapeSchema = z
	.object({
		_type: z.literal('unknown'),
		note: z.string(),
		shapeId: SimpleShapeIdSchema,
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
	FocusedImageShapeSchema,
	FocusedUnknownShapeSchema,
] as const

// Shapes that can be created by the AI (excludes pen/draw and image shapes)
const FOCUSED_CREATABLE_SHAPES_SCHEMAS = [
	FocusedGeoShapeSchema,
	FocusedLineShapeSchema,
	FocusedTextShapeSchema,
	FocusedArrowShapeSchema,
	FocusedNoteShapeSchema,
] as const

export const FocusedShapeSchema = z.union(FOCUSED_SHAPES_SCHEMAS)
export const FocusedCreatableShapeSchema = z.union(FOCUSED_CREATABLE_SHAPES_SCHEMAS)
export const FocusedShapePartialSchema = z.union(
	FOCUSED_SHAPES_SCHEMAS.map((schema) => schema.partial())
)
export type FocusedShape = z.infer<typeof FocusedShapeSchema>
export type FocusedCreatableShape = z.infer<typeof FocusedCreatableShapeSchema> & {
	shapeId: SimpleShapeId
}
export type FocusedShapePartial = z.infer<typeof FocusedShapePartialSchema> & {
	shapeId?: SimpleShapeId
}
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
