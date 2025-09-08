import {
	Editor,
	TLArrowBinding,
	TLArrowShape,
	TLDrawShape,
	TLEmbedShape,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLShape,
	TLShapeId,
	TLTextShape,
} from 'tldraw'
import { z } from 'zod'
import { SimpleColor } from './SimpleColor'
import { convertTldrawFillToSimpleFill, SimpleFill } from './SimpleFill'
import { convertTldrawFontSizeAndScaleToSimpleFontSize, SimpleFontSize } from './SimpleFontSize'
import { convertTldrawGeoTypeToSimpleGeoType, SimpleGeoShapeType } from './SimpleGeoShapeType'

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

/**
 * Convert a tldraw shape to a simple shape
 */
export function convertTldrawShapeToSimpleShape(shape: TLShape, editor: Editor): ISimpleShape {
	switch (shape.type) {
		case 'text':
			return convertTextShapeToSimple(editor, shape as TLTextShape)
		case 'geo':
			return convertGeoShapeToSimple(editor, shape as TLGeoShape)
		case 'line':
			return convertLineShapeToSimple(editor, shape as TLLineShape)
		case 'arrow':
			return convertArrowShapeToSimple(editor, shape as TLArrowShape)
		case 'note':
			return convertNoteShapeToSimple(editor, shape as TLNoteShape)
		case 'draw':
			return convertDrawShapeToSimple(editor, shape as TLDrawShape)
		case 'bookmark':
			return convertEmbedShapeToSimple(editor, shape as TLEmbedShape)
		default:
			return convertUnknownShapeToSimple(editor, shape)
	}
}

export function convertTldrawIdToSimpleId(id: TLShapeId): string {
	return id.slice('shape:'.length)
}

export function convertSimpleShapeIdToTldrawShapeId(id: string): TLShapeId {
	return ('shape:' + id) as TLShapeId
}

function convertDrawShapeToSimple(_editor: Editor, shape: TLDrawShape): ISimpleDrawShape {
	return {
		_type: 'draw',
		color: shape.props.color,
		fill: convertTldrawFillToSimpleFill(shape.props.fill),
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
	}
}

function convertTextShapeToSimple(editor: Editor, shape: TLTextShape): ISimpleTextShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape) ?? ''

	const textSize = shape.props.size
	const textAlign = shape.props.textAlign
	const textWidth = shape.props.w

	let anchorX = shape.x
	switch (textAlign) {
		case 'middle':
			anchorX = shape.x + textWidth / 2
			break
		case 'end':
			anchorX = shape.x + textWidth
			break
		case 'start':
		default:
			anchorX = shape.x
			break
	}

	return {
		_type: 'text',
		color: shape.props.color,
		fontSize: convertTldrawFontSizeAndScaleToSimpleFontSize(textSize, shape.props.scale),
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: text,
		textAlign: shape.props.textAlign,
		x: anchorX,
		y: shape.y,
	}
}

function convertGeoShapeToSimple(editor: Editor, shape: TLGeoShape): ISimpleGeoShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)

	const shapeTextAlign = shape.props.align
	let newTextAlign: ISimpleGeoShape['textAlign']
	switch (shapeTextAlign) {
		case 'start-legacy':
			newTextAlign = 'start'
			break
		case 'middle-legacy':
			newTextAlign = 'middle'
			break
		case 'end-legacy':
			newTextAlign = 'end'
			break
		default:
			newTextAlign = shapeTextAlign
			break
	}

	return {
		_type: convertTldrawGeoTypeToSimpleGeoType(shape.props.geo),
		color: shape.props.color,
		fill: convertTldrawFillToSimpleFill(shape.props.fill),
		h: shape.props.h,
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: text ?? '',
		textAlign: newTextAlign,
		w: shape.props.w,
		x: shape.x,
		y: shape.y,
	}
}

function convertLineShapeToSimple(_editor: Editor, shape: TLLineShape): ISimpleLineShape {
	const points = Object.values(shape.props.points).sort((a, b) => a.index.localeCompare(b.index))
	return {
		_type: 'line',
		color: shape.props.color,
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		x1: points[0].x + shape.x,
		x2: points[1].x + shape.x,
		y1: points[0].y + shape.y,
		y2: points[1].y + shape.y,
	}
}

function convertArrowShapeToSimple(editor: Editor, shape: TLArrowShape): ISimpleArrowShape {
	const bindings = editor.store.query.records('binding').get()
	const arrowBindings = bindings.filter(
		(b) => b.type === 'arrow' && b.fromId === shape.id
	) as TLArrowBinding[]
	const startBinding = arrowBindings.find((b) => b.props.terminal === 'start')
	const endBinding = arrowBindings.find((b) => b.props.terminal === 'end')

	return {
		_type: 'arrow',
		bend: shape.props.bend,
		color: shape.props.color,
		fromId: startBinding?.toId ?? null,
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: (shape.meta?.text as string) ?? '',
		toId: endBinding?.toId ?? null,
		x1: shape.props.start.x + shape.x,
		x2: shape.props.end.x + shape.x,
		y1: shape.props.start.y + shape.y,
		y2: shape.props.end.y + shape.y,
	}
}

function convertNoteShapeToSimple(editor: Editor, shape: TLNoteShape): ISimpleNoteShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)
	return {
		_type: 'note',
		color: shape.props.color,
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: text ?? '',
		x: shape.x,
		y: shape.y,
	}
}

function convertEmbedShapeToSimple(editor: Editor, shape: TLEmbedShape): ISimpleEmbedShape {
	return {
		_type: 'bookmark',
		url: shape.props.url,
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		x: shape.x,
		y: shape.y,
	}
}

function convertUnknownShapeToSimple(_editor: Editor, shape: TLShape): ISimpleUnknownShape {
	return {
		_type: 'unknown',
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		subType: shape.type,
		x: shape.x,
		y: shape.y,
	}
}
