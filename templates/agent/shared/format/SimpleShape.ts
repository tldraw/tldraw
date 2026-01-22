import { z } from 'zod'
import { SimpleShapeIdSchema } from '../types/ids-schema'
import { SimpleColor } from './SimpleColor'
import { SimpleFillSchema } from './SimpleFill'
import { SimpleFontSize } from './SimpleFontSize'
import { SimpleGeoShapeTypeSchema } from './SimpleGeoShapeType'

const SimpleLabel = z.string()

export const SimpleTextAnchorSchema = z.enum([
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

export type SimpleTextAnchor = z.infer<typeof SimpleTextAnchorSchema>

export const SimpleGeoShape = z.object({
	_type: SimpleGeoShapeTypeSchema,
	color: SimpleColor,
	fill: SimpleFillSchema,
	h: z.number(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: SimpleLabel.optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

export type SimpleGeoShape = z.infer<typeof SimpleGeoShape>

export const SimpleGeoShapePartialSchema = SimpleGeoShape.partial()
export type SimpleGeoShapePartial = z.infer<typeof SimpleGeoShapePartialSchema>

const SimpleLineShape = z.object({
	_type: z.literal('line'),
	color: SimpleColor,
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
})

export type SimpleLineShape = z.infer<typeof SimpleLineShape>

const SimpleNoteShape = z.object({
	_type: z.literal('note'),
	color: SimpleColor,
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: SimpleLabel.optional(),
	x: z.number(),
	y: z.number(),
})

export type SimpleNoteShape = z.infer<typeof SimpleNoteShape>

const SimpleTextShape = z
	.object({
		_type: z.literal('text'),
		anchor: SimpleTextAnchorSchema,
		color: SimpleColor,
		fontSize: SimpleFontSize.optional(),
		maxWidth: z.number().nullable(),
		note: z.string(),
		shapeId: SimpleShapeIdSchema,
		text: SimpleLabel,
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Text Shape',
		description:
			'A text shape is a shape that contains text. The `anchor` property indicates how the text shape is positioned and aligned. For example, the "top-left" anchor means the text shape\'s x and y coordinates are the top left corner of the text shape, and the text gets left aligned. A shape with the "bottom-center" anchor means the text shape\'s x and y coordinates are the bottom center of the text shape, and the text gets center aligned on the horizontal axis. By default, text shapes auto-size to fit their content. If you provide a `maxWidth`, the text will automatically wrap to the next line if it exceeds that width (there is no need to add manual line breaks for word wrapping).',
	})

export type SimpleTextShape = z.infer<typeof SimpleTextShape>

export const SimpleTextShapePartialSchema = SimpleTextShape.partial()
export type SimpleTextShapePartial = z.infer<typeof SimpleTextShapePartialSchema>

const SimpleArrowShape = z.object({
	_type: z.literal('arrow'),
	color: SimpleColor,
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

export type SimpleArrowShape = z.infer<typeof SimpleArrowShape>

const SimpleDrawShape = z
	.object({
		_type: z.literal('draw'),
		color: SimpleColor,
		fill: SimpleFillSchema.optional(),
		note: z.string(),
		shapeId: SimpleShapeIdSchema,
	})
	.meta({
		title: 'Draw Shape',
		description:
			'A draw shape is a freeform shape that was drawn by the pen tool. IMPORTANT: Do not create draw shapes with the "create" action. To create new draw shapes, the AI must use the pen event because it gives more control.',
	})

export type SimpleDrawShape = z.infer<typeof SimpleDrawShape>

const SimpleUnknownShape = z
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

export type SimpleUnknownShape = z.infer<typeof SimpleUnknownShape>

const SIMPLE_SHAPES = [
	SimpleDrawShape,
	SimpleGeoShape,
	SimpleLineShape,
	SimpleTextShape,
	SimpleArrowShape,
	SimpleNoteShape,
	SimpleUnknownShape,
] as const
export const SimpleShapeSchema = z.union(SIMPLE_SHAPES)

export type SimpleShape = z.infer<typeof SimpleShapeSchema>

export type SimpleShapePartial = Partial<SimpleShape>

/**
 * Extract all shape type names from the schema
 */
export function getSimpleShapeSchemaNames() {
	const typeNames: SimpleShape['_type'][] = []

	for (const shapeSchema of SIMPLE_SHAPES) {
		const typeField = shapeSchema.shape._type

		if (typeField) {
			// Handle ZodLiterals (like SimpleDrawShape)
			if ('value' in typeField && typeof typeField.value === 'string') {
				typeNames.push(typeField.value)
			}
			// Handle ZodEnums (like SimpleGeoShape)
			else if ('options' in typeField && Array.isArray(typeField.options)) {
				typeNames.push(...typeField.options)
			}
		}
	}

	return typeNames
}
