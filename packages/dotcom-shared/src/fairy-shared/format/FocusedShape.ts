import { z } from 'zod'
import { SimpleColor } from './SimpleColor'
import { SimpleFillSchema } from './SimpleFill'
import { SimpleFontSize } from './SimpleFontSize'
import { SimpleGeoShapeTypeSchema } from './SimpleGeoShapeType'

const SimpleLabel = z.string()

export const FocusedGeoShape = z.object({
	_type: SimpleGeoShapeTypeSchema,
	color: SimpleColor,
	fill: SimpleFillSchema,
	h: z.number(),
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel.optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

export type FocusedGeoShape = z.infer<typeof FocusedGeoShape>

const FocusedLineShape = z.object({
	_type: z.literal('line'),
	color: SimpleColor,
	note: z.string(),
	shapeId: z.string(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
})

export type FocusedLineShape = z.infer<typeof FocusedLineShape>

const FocusedNoteShape = z.object({
	_type: z.literal('note'),
	color: SimpleColor,
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel.optional(),
	x: z.number(),
	y: z.number(),
})

export type FocusedNoteShape = z.infer<typeof FocusedNoteShape>

const FocusedTextAnchor = z.enum([
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

export type FocusedTextAnchor = z.infer<typeof FocusedTextAnchor>

const FocusedTextShape = z
	.object({
		_type: z.literal('text'),
		anchor: FocusedTextAnchor,
		color: SimpleColor,
		fontSize: SimpleFontSize.optional(),
		note: z.string(),
		shapeId: z.string(),
		text: SimpleLabel,
		width: z.number().optional(),
		wrap: z.boolean().optional(),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Text Shape',
		description:
			'A text shape is a shape that contains text. The `anchor` property indicates how the text shape is positioned and aligned. For example, the "top-left" anchor means the text shape\'s x and y coordinates are the top left corner of the text shape, and the text gets left aligned. A shape with the "bottom-center" anchor means the text shape\'s x and y coordinates are the bottom center of the text shape, and the text gets center aligned on the horizontal axis.',
	})

export type FocusedTextShape = z.infer<typeof FocusedTextShape>

const FocusedArrowShape = z.object({
	_type: z.literal('arrow'),
	color: SimpleColor,
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

export type FocusedArrowShape = z.infer<typeof FocusedArrowShape>

const FocusedDrawShape = z
	.object({
		_type: z.literal('draw'),
		color: SimpleColor,
		fill: SimpleFillSchema.optional(),
		note: z.string(),
		shapeId: z.string(),
	})
	.meta({
		title: 'Draw Shape',
		description:
			'A draw shape is a freeform shape that was drawn by the pen tool. To create new draw shapes, the AI must use the pen event because it gives more control.',
	})

export type FocusedDrawShape = z.infer<typeof FocusedDrawShape>

const FocusedUnknownShape = z
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

export type FocusedUnknownShape = z.infer<typeof FocusedUnknownShape>

const FOCUSED_SHAPES = [
	FocusedDrawShape,
	FocusedGeoShape,
	FocusedLineShape,
	FocusedTextShape,
	FocusedArrowShape,
	FocusedNoteShape,
	FocusedUnknownShape,
] as const
export const FocusedShapeSchema = z.union(FOCUSED_SHAPES)

export type FocusedShape = z.infer<typeof FocusedShapeSchema>

/**
 * Extract all shape type names from the schema
 */
export function getFocusedShapeSchemaNames() {
	const typeNames: FocusedShape['_type'][] = []

	for (const shapeSchema of FOCUSED_SHAPES) {
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
