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

const FocusedTextShape = z.object({
	_type: z.literal('text'),
	color: SimpleColor,
	fontSize: SimpleFontSize.optional(),
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel,
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	width: z.number().optional(),
	wrap: z.boolean().optional(),
	x: z.number(),
	y: z.number(),
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
