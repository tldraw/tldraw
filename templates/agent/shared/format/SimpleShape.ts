import { z } from 'zod'
import { SimpleColor } from './SimpleColor'
import { SimpleFill } from './SimpleFill'
import { SimpleFontSize } from './SimpleFontSize'
import { SimpleGeoShapeType } from './SimpleGeoShapeType'

const SimpleLabel = z.string()

export const SimpleGeoShape = z.object({
	_type: SimpleGeoShapeType,
	color: SimpleColor,
	fill: SimpleFill,
	h: z.number(),
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel.optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

export type ISimpleGeoShape = z.infer<typeof SimpleGeoShape>

const SimpleLineShape = z.object({
	_type: z.literal('line'),
	color: SimpleColor,
	note: z.string(),
	shapeId: z.string(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
})

export type ISimpleLineShape = z.infer<typeof SimpleLineShape>

const SimpleNoteShape = z.object({
	_type: z.literal('note'),
	color: SimpleColor,
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel.optional(),
	x: z.number(),
	y: z.number(),
})

export type ISimpleNoteShape = z.infer<typeof SimpleNoteShape>

const SimpleTextShape = z.object({
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

export type ISimpleTextShape = z.infer<typeof SimpleTextShape>

const SimpleArrowShape = z.object({
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

export type ISimpleArrowShape = z.infer<typeof SimpleArrowShape>

const SimpleDrawShape = z
	.object({
		_type: z.literal('draw'),
		color: SimpleColor,
		fill: SimpleFill.optional(),
		note: z.string(),
		shapeId: z.string(),
	})
	.meta({
		title: 'Draw Shape',
		description:
			'A draw shape is a freeform shape that was drawn by the pen tool. To create new draw shapes, the AI must use the pen event because it gives more control.',
	})

export type ISimpleDrawShape = z.infer<typeof SimpleDrawShape>

const SimpleEmbedShape = z.object({
	_type: z.literal('bookmark'),
	note: z.string(),
	shapeId: z.string(),
	url: z.string(),
	x: z.number(),
	y: z.number(),
})

export type ISimpleEmbedShape = z.infer<typeof SimpleEmbedShape>

const SimpleUnknownShape = z
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

export type ISimpleUnknownShape = z.infer<typeof SimpleUnknownShape>

const SIMPLE_SHAPES = [
	SimpleDrawShape,
	SimpleGeoShape,
	SimpleLineShape,
	SimpleTextShape,
	SimpleArrowShape,
	SimpleNoteShape,
	SimpleUnknownShape,
	SimpleEmbedShape,
] as const
export const SimpleShape = z.union(SIMPLE_SHAPES)

export type ISimpleShape = z.infer<typeof SimpleShape>

/**
 * Extract all shape type names from the schema
 */
export function getSimpleShapeTypeNames() {
	const typeNames: ISimpleShape['_type'][] = []

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
