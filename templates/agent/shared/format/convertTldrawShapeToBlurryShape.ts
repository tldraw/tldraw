import { Editor, TLDefaultShape, TLShape } from 'tldraw'
import { BlurryShape } from './BlurryShape'
import { convertTldrawIdToSimpleId } from './convertTldrawShapeToSimpleShape'
import { convertTldrawTypeToSimpleType } from './SimpleGeoShapeType'
import { ISimpleShape } from './SimpleShape'

/**
 * Convert a tldraw shape to the blurry shape format
 */
export function convertTldrawShapeToBlurryShape(
	shape: TLShape,
	editor: Editor
): BlurryShape | null {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) return null

	const util = editor.getShapeUtil(shape)
	const text = util.getText(shape)

	const shapeType = convertTldrawTypeToSimpleType(shape.type as TLDefaultShape['type'] | 'unknown')

	return {
		x: Math.round(bounds.x),
		y: Math.round(bounds.y),
		w: Math.round(bounds.w),
		h: Math.round(bounds.h),
		type: shapeType as ISimpleShape['_type'],
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text,
	}
}
