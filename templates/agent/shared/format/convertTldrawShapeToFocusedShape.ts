import {
	Box,
	Editor,
	isPageId,
	TLArrowShape,
	TLDrawShape,
	TLGeoShape,
	TLGeoShapeGeoStyle,
	TLLineShape,
	TLNoteShape,
	TLShape,
	TLShapeId,
	TLTextShape,
	Vec,
} from 'tldraw'
import { SimpleShapeId } from '../types/ids-schema'
import { measureUncreatedShapeBounds } from './convertFocusedShapeToTldrawShape'
import { convertTldrawFillToFocusedFill } from './FocusedFill'
import { convertTldrawFontSizeAndScaleToFocusedFontSize } from './FocusedFontSize'
import { FocusedGeoShapeType } from './FocusedGeoShapeType'
import {
	FocusedArrowShape,
	FocusedDrawShape,
	FocusedGeoShape,
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
			return convertDrawShapeToFocused(shape as TLDrawShape)
		default:
			return convertUnknownShapeToFocused(editor, shape)
	}
}

export function convertTldrawShapeToFocusedType(shape: TLShape): FocusedShape['_type'] {
	switch (shape.type) {
		case 'geo': {
			const geoShape = shape as TLGeoShape
			return GEO_TO_FOCUSED_TYPES[geoShape.props.geo]
		}
		case 'text':
		case 'line':
		case 'arrow':
		case 'note':
		case 'draw':
			return shape.type
		default:
			return 'unknown'
	}
}

const GEO_TO_FOCUSED_TYPES: Record<TLGeoShapeGeoStyle, FocusedGeoShapeType> = {
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
	return id.slice(6) as SimpleShapeId
}

function convertDrawShapeToFocused(shape: TLDrawShape): FocusedDrawShape {
	return {
		_type: 'draw',
		color: shape.props.color,
		fill: convertTldrawFillToFocusedFill(shape.props.fill),
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
	}
}

const TEXT_ALIGN_TO_ANCHOR: Record<
	TLTextShape['props']['textAlign'],
	(bounds: Box) => { anchor: FocusedTextAnchor; x: number }
> = {
	start: (bounds) => ({ anchor: 'top-left', x: bounds.left }),
	middle: (bounds) => ({ anchor: 'top-center', x: bounds.center.x }),
	end: (bounds) => ({ anchor: 'top-right', x: bounds.right }),
}

function convertTextShapeToFocused(editor: Editor, shape: TLTextShape): FocusedTextShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape) ?? ''
	const bounds = getSimpleBounds(editor, shape)

	const { anchor, x } = TEXT_ALIGN_TO_ANCHOR[shape.props.textAlign](bounds)

	return {
		_type: 'text',
		anchor,
		color: shape.props.color,
		fontSize: convertTldrawFontSizeAndScaleToFocusedFontSize(editor, shape),
		maxWidth: shape.props.autoSize ? null : shape.props.w,
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: text,
		x,
		y: bounds.top,
	}
}

function convertGeoShapeToFocused(editor: Editor, shape: TLGeoShape): FocusedGeoShape {
	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)
	const bounds = getSimpleBounds(editor, shape)
	const textAlign = shape.props.align.replace('-legacy', '') as FocusedGeoShape['textAlign']

	return {
		_type: GEO_TO_FOCUSED_TYPES[shape.props.geo],
		color: shape.props.color,
		fill: convertTldrawFillToFocusedFill(shape.props.fill),
		h: shape.props.h,
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: text ?? '',
		textAlign,
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
	const arrowBindings = editor.getBindingsFromShape(shape, 'arrow')
	const startBinding = arrowBindings.find((b) => b.props.terminal === 'start')
	const endBinding = arrowBindings.find((b) => b.props.terminal === 'end')

	return {
		_type: 'arrow',
		bend: shape.props.bend * -1,
		color: shape.props.color,
		fromId: startBinding ? convertTldrawIdToSimpleId(startBinding.toId) : null,
		note: (shape.meta.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: (shape.meta.text as string) ?? '',
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
	// Compute page position from the shape record's own x/y, not the editor's cached bounds.
	// This is critical for diffing historical shape records where the editor's
	// current state differs from the shape record being converted.
	const pagePoint = getShapePagePoint(editor, shape)

	// Try to get dimensions from shape props first
	const props = shape.props as { w?: number; h?: number }
	if (props.w !== undefined && props.h !== undefined) {
		return new Box(pagePoint.x, pagePoint.y, props.w, props.h)
	}

	// Fall back to editor bounds for dimensions only (position comes from shape record)
	const bounds = editor.getShapePageBounds(shape) ?? measureUncreatedShapeBounds(editor, shape)
	return new Box(pagePoint.x, pagePoint.y, bounds.w, bounds.h)
}

/**
 * Get the page-space position of a shape from its record's x/y values.
 * For shapes at the root level, this is just shape.x/y.
 * For shapes inside frames/groups, we transform through the parent's page transform.
 */
function getShapePagePoint(editor: Editor, shape: TLShape): Vec {
	// If the shape is at the root level (parent is a page), use x/y directly
	if (isPageId(shape.parentId)) {
		return new Vec(shape.x, shape.y)
	}

	// For shapes inside parents, get the parent's page transform and apply it
	// Note: We use the editor's current parent transform, which is correct as long
	// as the parent itself hasn't moved in the same diff (uncommon case)
	return editor.getShapePageTransform(shape.parentId).applyToPoint(new Vec(shape.x, shape.y))
}
