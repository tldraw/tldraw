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
import { ISimpleShape } from '../../../worker/simple/SimpleShape'
import { shapeFillToSimpleFill } from '../../../worker/simple/color'

// Main shape converter function
export function convertTldrawShapeToSimpleShape(shape: TLShape, editor: Editor): ISimpleShape {
	switch (shape.type) {
		case 'text':
			return convertTextShape(shape as TLTextShape)
		case 'geo':
			return convertGeoShape(shape as TLGeoShape)
		case 'line':
			return convertLineShape(shape as TLLineShape)
		case 'arrow':
			return convertArrowShape(shape as TLArrowShape, editor)
		case 'note':
			return convertNoteShape(shape as TLNoteShape)
		default:
			return convertUnknownShape(shape)
	}
}

// Individual shape converter functions
function convertTextShape(shape: TLTextShape): ISimpleShape {
	return {
		shapeId: shape.id.slice('shape:'.length),
		_type: 'text',
		text: (shape.meta?.text as string) ?? '',
		x: shape.x,
		y: shape.y,
		color: shape.props.color,
		note: (shape.meta?.note as string) ?? '',
	}
}

function convertGeoShape(shape: TLGeoShape): ISimpleShape {
	return {
		shapeId: shape.id.slice('shape:'.length),
		_type: shape.props.geo,
		x: shape.x,
		y: shape.y,
		width: shape.props.w,
		height: shape.props.h,
		color: shape.props.color,
		fill: shapeFillToSimpleFill(shape.props.fill),
		text: (shape.meta?.text as string) ?? '',
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

function convertNoteShape(shape: TLNoteShape): ISimpleShape {
	return {
		shapeId: shape.id.slice('shape:'.length),
		_type: 'note',
		x: shape.x,
		y: shape.y,
		color: shape.props.color,
		text: (shape.meta?.text as string) ?? '',
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
