import {
	Box,
	createShapeId,
	Editor,
	reverseRecordsDiff,
	TLArrowBinding,
	TLArrowShape,
	TLDrawShape,
	TLGeoShape,
	TLGeoShapeGeoStyle,
	TLImageShape,
	TLLineShape,
	TLNoteShape,
	TLShape,
	TLShapeId,
	TLTextShape,
	Vec,
} from '@tldraw/editor'
import { toSimpleShapeId } from '..'
import { SimpleShapeId } from '../schema/id-schemas'
import { convertTldrawFillToFocusFill } from './FocusFill'
import { convertTldrawFontSizeToFocusFontSize } from './FocusFontSize'
import {
	FocusedArrowShape,
	FocusedDrawShape,
	FocusedGeoShape,
	FocusedGeoType,
	FocusedImageShape,
	FocusedLineShape,
	FocusedNoteShape,
	FocusedShape,
	FocusedTextAnchor,
	FocusedTextShape,
	FocusedUnknownShape,
} from './FocusedShape'

/**
 * Convert a tldraw shape to a focused shape
 */
export function convertTldrawShapeToFocusedShape(editor: Editor, shape: TLShape): FocusedShape {
	switch (shape.type) {
		case 'text':
			return convertTextShapeToFocused(editor, shape as TLTextShape)
		case 'geo':
			return convertGeoShapeToFocused(editor, shape as TLGeoShape)
		case 'line':
			return convertLineShapeToFocused(editor, shape as TLLineShape)
		case 'arrow':
			return convertArrowShapeToFocused(editor, shape as TLArrowShape)
		case 'note':
			return convertNoteShapeToFocused(editor, shape as TLNoteShape)
		case 'draw':
			return convertDrawShapeToFocused(editor, shape as TLDrawShape)
		case 'image':
			return convertImageShapeToFocused(editor, shape as TLImageShape)
		default:
			return convertUnknownShapeToFocused(editor, shape)
	}
}

export function convertTldrawShapeToFocusedType(shape: TLShape): FocusedShape['_type'] {
	switch (shape.type) {
		case 'geo': {
			const geoShape = shape as TLGeoShape
			return GEO_TO_SIMPLE_TYPES[geoShape.props.geo]
		}
		case 'text':
		case 'line':
		case 'arrow':
		case 'note':
		case 'image':
			return shape.type
		case 'draw':
			return 'pen'
		default:
			return 'unknown'
	}
}

const GEO_TO_SIMPLE_TYPES: Record<TLGeoShapeGeoStyle, FocusedGeoType> = {
	rectangle: 'rectangle',
	ellipse: 'ellipse',
	triangle: 'triangle',
	diamond: 'diamond',
	hexagon: 'hexagon',
	oval: 'pill',
	cloud: 'cloud',
	'x-box': 'x-box',
	'check-box': 'check-box',
	heart: 'heart',
	pentagon: 'pentagon',
	octagon: 'octagon',
	star: 'star',
	rhombus: 'parallelogram-right',
	'rhombus-2': 'parallelogram-left',
	trapezoid: 'trapezoid',
	'arrow-right': 'fat-arrow-right',
	'arrow-left': 'fat-arrow-left',
	'arrow-up': 'fat-arrow-up',
	'arrow-down': 'fat-arrow-down',
} as const

export function convertTldrawIdToSimpleId(id: TLShapeId): SimpleShapeId {
	return toSimpleShapeId(id.slice(6))
}

function convertDrawShapeToFocused(editor: Editor, shape: TLDrawShape): FocusedDrawShape {
	return {
		_type: 'pen',
		color: shape.props.color,
		fill: convertTldrawFillToFocusFill(shape.props.fill),
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
	}
}

function convertTextShapeToFocused(editor: Editor, shape: TLTextShape): FocusedTextShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape) ?? ''
	const bounds = getSimpleBounds(editor, shape)
	const textSize = shape.props.size

	const position = new Vec()
	let anchor: FocusedTextAnchor = 'bottom-center'
	switch (shape.props.textAlign) {
		case 'middle': {
			anchor = 'top-center'
			position.x = bounds.center.x
			position.y = bounds.top
			break
		}
		case 'end': {
			anchor = 'top-right'
			position.x = bounds.right
			position.y = bounds.top
			break
		}
		case 'start': {
			anchor = 'top-left'
			position.x = bounds.left
			position.y = bounds.top
			break
		}
	}

	return {
		_type: 'text',
		anchor,
		color: shape.props.color,
		fontSize: convertTldrawFontSizeToFocusFontSize(textSize, shape.props.scale),
		maxWidth: shape.props.autoSize ? null : shape.props.w,
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: text,
		x: position.x,
		y: position.y,
	}
}

function convertGeoShapeToFocused(editor: Editor, shape: TLGeoShape): FocusedGeoShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)
	const bounds = getSimpleBounds(editor, shape)
	const shapeTextAlign = shape.props.align

	let newTextAlign: FocusedGeoShape['textAlign']
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
		_type: GEO_TO_SIMPLE_TYPES[shape.props.geo],
		color: shape.props.color,
		fill: convertTldrawFillToFocusFill(shape.props.fill),
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

function convertLineShapeToFocused(editor: Editor, shape: TLLineShape): FocusedLineShape {
	const bounds = getSimpleBounds(editor, shape)
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

function convertArrowShapeToFocused(editor: Editor, shape: TLArrowShape): FocusedArrowShape {
	const bounds = getSimpleBounds(editor, shape)
	const bindings = editor.store.query.records('binding').get()
	const arrowBindings = bindings.filter(
		(b) => b.type === 'arrow' && b.fromId === shape.id
	) as TLArrowBinding[]
	const startBinding = arrowBindings.find((b) => b.props.terminal === 'start')
	const endBinding = arrowBindings.find((b) => b.props.terminal === 'end')

	return {
		_type: 'arrow',
		bend: shape.props.bend * -1,
		color: shape.props.color,
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: (shape.meta.text as string) ?? '',
		fromId: startBinding ? convertTldrawIdToSimpleId(startBinding.toId) : null,
		toId: endBinding ? convertTldrawIdToSimpleId(endBinding.toId) : null,
		x1: shape.props.start.x + bounds.x,
		x2: shape.props.end.x + bounds.x,
		y1: shape.props.start.y + bounds.y,
		y2: shape.props.end.y + bounds.y,
	}
}

function convertNoteShapeToFocused(editor: Editor, shape: TLNoteShape): FocusedNoteShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)
	const bounds = getSimpleBounds(editor, shape)
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

function convertImageShapeToFocused(editor: Editor, shape: TLImageShape): FocusedImageShape {
	const bounds = getSimpleBounds(editor, shape)
	return {
		_type: 'image',
		altText: shape.props.altText,
		h: shape.props.h,
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		w: shape.props.w,
		x: bounds.x,
		y: bounds.y,
	}
}

function convertUnknownShapeToFocused(editor: Editor, shape: TLShape): FocusedUnknownShape {
	const bounds = getSimpleBounds(editor, shape)
	return {
		_type: 'unknown',
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		subType: shape.type,
		x: bounds.x,
		y: bounds.y,
	}
}

function getSimpleBounds(editor: Editor, shape: TLShape): Box {
	const bounds = editor.getShapePageBounds(shape)
	if (bounds) {
		return bounds
	}

	return getDummyBounds(editor, shape)
}

export function getDummyBounds(editor: Editor, shape: TLShape): Box {
	// Create a dummy shape and get the bounds, then reverse the creation of the dummy shape
	let dummyBounds: Box | undefined
	const diff = editor.store.extractingChanges(() => {
		editor.run(
			() => {
				const dummyId = createShapeId()
				editor.createShape({
					...shape,
					id: dummyId,
				})
				dummyBounds = editor.getShapePageBounds(dummyId)
			},
			{ ignoreShapeLock: false, history: 'ignore' }
		)
	})
	const reverseDiff = reverseRecordsDiff(diff)
	editor.store.applyDiff(reverseDiff)

	if (!dummyBounds) {
		throw new Error('Failed to get bounds for shape')
	}
	return dummyBounds
}
