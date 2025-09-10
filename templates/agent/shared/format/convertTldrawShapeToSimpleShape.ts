import {
	Editor,
	TLArrowBinding,
	TLArrowShape,
	TLDrawShape,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLShape,
	TLShapeId,
	TLTextShape,
} from 'tldraw'
import { convertTldrawFillToSimpleFill } from './SimpleFill'
import { convertTldrawFontSizeAndScaleToSimpleFontSize } from './SimpleFontSize'
import { convertTldrawGeoTypeToSimpleGeoType } from './SimpleGeoShapeType'
import {
	ISimpleArrowShape,
	ISimpleDrawShape,
	ISimpleGeoShape,
	ISimpleLineShape,
	ISimpleNoteShape,
	ISimpleShape,
	ISimpleTextShape,
	ISimpleUnknownShape,
} from './SimpleShape'

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
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
	}
}

function convertTextShapeToSimple(editor: Editor, shape: TLTextShape): ISimpleTextShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape) ?? ''

	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) {
		throw new Error('Could not get bounds for text shape')
	}

	const textSize = shape.props.size
	const textAlign = shape.props.textAlign
	const textWidth = shape.props.w

	let anchorX = bounds.x
	switch (textAlign) {
		case 'middle':
			anchorX = bounds.x + textWidth / 2
			break
		case 'end':
			anchorX = bounds.x + textWidth
			break
		case 'start':
		default:
			anchorX = bounds.x
			break
	}

	return {
		_type: 'text',
		color: shape.props.color,
		fontSize: convertTldrawFontSizeAndScaleToSimpleFontSize(textSize, shape.props.scale),
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: text,
		textAlign: shape.props.textAlign,
		x: anchorX,
		y: bounds.y,
	}
}

function convertGeoShapeToSimple(editor: Editor, shape: TLGeoShape): ISimpleGeoShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)

	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) {
		throw new Error('Could not get bounds for geo shape')
	}

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
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: text ?? '',
		textAlign: newTextAlign,
		w: shape.props.w,
		x: bounds.x,
		y: bounds.y,
	}
}

function convertLineShapeToSimple(editor: Editor, shape: TLLineShape): ISimpleLineShape {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) {
		throw new Error('Could not get bounds for line shape')
	}

	const points = Object.values(shape.props.points).sort((a, b) => a.index.localeCompare(b.index))
	return {
		_type: 'line',
		color: shape.props.color,
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		x1: points[0].x + bounds.x,
		x2: points[1].x + bounds.x,
		y1: points[0].y + bounds.y,
		y2: points[1].y + bounds.y,
	}
}

function convertArrowShapeToSimple(editor: Editor, shape: TLArrowShape): ISimpleArrowShape {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) {
		throw new Error('Could not get bounds for arrow shape')
	}

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
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: (shape.meta.text as string) ?? '',
		toId: endBinding?.toId ?? null,
		x1: shape.props.start.x + bounds.x,
		x2: shape.props.end.x + bounds.x,
		y1: shape.props.start.y + bounds.y,
		y2: shape.props.end.y + bounds.y,
	}
}

function convertNoteShapeToSimple(editor: Editor, shape: TLNoteShape): ISimpleNoteShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)

	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) {
		throw new Error('Could not get bounds for note shape')
	}

	return {
		_type: 'note',
		color: shape.props.color,
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: text ?? '',
		x: bounds.x,
		y: bounds.y,
	}
}

function convertUnknownShapeToSimple(editor: Editor, shape: TLShape): ISimpleUnknownShape {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) {
		throw new Error('Could not get bounds for unknown shape')
	}

	return {
		_type: 'unknown',
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		subType: shape.type,
		x: bounds.x,
		y: bounds.y,
	}
}
