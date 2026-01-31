import { Editor, TLShape } from 'tldraw'
import { BlurryShape } from './BlurryShape'
import {
	convertTldrawIdToSimpleId,
	convertTldrawShapeToFocusedType,
} from './convertTldrawShapeToFocusedShape'
import { FocusedShape } from './FocusedShape'

/**
 * Convert a tldraw shape to the blurry shape format
 */
export function convertTldrawShapeToBlurryShape(
	editor: Editor,
	shape: TLShape
): BlurryShape | null {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) return null

	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)

	const shapeType = convertTldrawShapeToFocusedType(shape)

	return {
		x: Math.round(bounds.x),
		y: Math.round(bounds.y),
		w: Math.round(bounds.w),
		h: Math.round(bounds.h),
		type: shapeType as FocusedShape['_type'],
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text,
	}
}
