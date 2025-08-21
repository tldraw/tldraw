import {
	Editor,
	TLArrowBinding,
	TLArrowShape,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLShape,
	TLTextShape,
} from 'tldraw'
import { z } from 'zod'
import { SimpleColor } from './SimpleColor'
import { convertTldrawFillToSimpleFill, SimpleFill } from './SimpleFill'

const SimpleLabel = z.string()

export const SimpleGeoShape = z.object({
	_type: z.enum([
		'rectangle',
		'ellipse',
		'triangle',
		'diamond',
		'hexagon',
		'oval',
		'cloud',
		'x-box',
		'check-box',
		'heart',
		'pentagon',
		'octagon',
		'star',
		'rhombus',
		'rhombus-2',
		'trapezoid',
		'arrow-right',
		'arrow-left',
		'arrow-up',
		'arrow-down',
	]),
	color: SimpleColor,
	fill: SimpleFill,
	height: z.number(),
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel.optional(),
	width: z.number(),
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
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel,
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
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

const SimplePenShape = z
	.object({
		_type: z.literal('pen'),
		color: SimpleColor,
		fill: SimpleFill.optional(),
		note: z.string(),
		shapeId: z.string(),
	})
	.meta({
		title: 'Pen Shape',
		description:
			'A pen shape is a freeform shape that was drawn by the pen tool. To create new pen shapes, the AI must use the pen event because it gives more control.',
	})

export type ISimplePenShape = z.infer<typeof SimplePenShape>

const SimpleUnknownShape = z.object({
	_type: z.literal('unknown'),
	note: z.string(),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
})

export type ISimpleUnknownShape = z.infer<typeof SimpleUnknownShape>

const SIMPLE_SHAPES = [
	SimplePenShape,
	SimpleGeoShape,
	SimpleLineShape,
	SimpleTextShape,
	SimpleArrowShape,
	SimpleNoteShape,
	SimpleUnknownShape,
] as const
export const SimpleShape = z.union(SIMPLE_SHAPES)

export type ISimpleShape = z.infer<typeof SimpleShape>

// Main shape converter function
export function convertTldrawShapeToSimpleShape(shape: TLShape, editor: Editor): ISimpleShape {
	switch (shape.type) {
		case 'text':
			return convertTextShape(shape as TLTextShape, editor)
		case 'geo':
			return convertGeoShape(shape as TLGeoShape, editor)
		case 'line':
			return convertLineShape(shape as TLLineShape)
		case 'arrow':
			return convertArrowShape(shape as TLArrowShape, editor)
		case 'note':
			return convertNoteShape(shape as TLNoteShape, editor)
		default:
			return convertUnknownShape(shape)
	}
}

// Individual shape converter functions
function convertTextShape(shape: TLTextShape, editor: Editor): ISimpleShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)
	return {
		shapeId: shape.id.slice('shape:'.length),
		_type: 'text',
		text: text ?? '',
		x: shape.x,
		y: shape.y,
		color: shape.props.color,
		note: (shape.meta?.note as string) ?? '',
	}
}

function convertGeoShape(shape: TLGeoShape, editor: Editor): ISimpleShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)

	return {
		_type: 'rectangle',
		shapeId: shape.id.slice('shape:'.length),
		x: shape.x,
		y: shape.y,
		width: shape.props.w,
		height: shape.props.h,
		color: shape.props.color,
		fill: convertTldrawFillToSimpleFill(shape.props.fill),
		text: text ?? '',
		note: (shape.meta?.note as string) ?? '',
	}
}

function convertLineShape(shape: TLLineShape): ISimpleShape {
	const points = Object.values(shape.props.points).sort((a, b) => a.index.localeCompare(b.index))
	return {
		_type: 'line',
		color: shape.props.color,
		note: (shape.meta?.note as string) ?? '',
		shapeId: shape.id.slice('shape:'.length),
		x1: points[0].x + shape.x,
		x2: points[1].x + shape.x,
		y1: points[0].y + shape.y,
		y2: points[1].y + shape.y,
	}
}

function convertArrowShape(shape: TLArrowShape, editor: Editor): ISimpleShape {
	const bindings = editor.store.query.records('binding').get()
	const arrowBindings = bindings.filter(
		(b) => b.type === 'arrow' && b.fromId === shape.id
	) as TLArrowBinding[]
	const startBinding = arrowBindings.find((b) => b.props.terminal === 'start')
	const endBinding = arrowBindings.find((b) => b.props.terminal === 'end')

	return {
		_type: 'arrow',
		color: shape.props.color,
		fromId: startBinding?.toId ?? null,
		shapeId: shape.id.slice('shape:'.length),
		text: (shape.meta?.text as string) ?? '',
		toId: endBinding?.toId ?? null,
		note: (shape.meta?.note as string) ?? '',
		bend: shape.props.bend,
		x1: shape.props.start.x + shape.x,
		x2: shape.props.end.x + shape.x,
		y1: shape.props.start.y + shape.y,
		y2: shape.props.end.y + shape.y,
	}
}

function convertNoteShape(shape: TLNoteShape, editor: Editor): ISimpleShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)
	return {
		shapeId: shape.id.slice('shape:'.length),
		_type: 'note',
		x: shape.x,
		y: shape.y,
		color: shape.props.color,
		text: text ?? '',
		note: (shape.meta?.note as string) ?? '',
	}
}

function convertUnknownShape(shape: TLShape): ISimpleShape {
	return {
		shapeId: shape.id.slice('shape:'.length),
		_type: 'unknown',
		note: (shape.meta?.note as string) ?? '',
		x: shape.x,
		y: shape.y,
	}
}
