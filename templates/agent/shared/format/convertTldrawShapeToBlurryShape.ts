import { Editor, TLShape } from 'tldraw'
import { BlurryShape } from './BlurryShape'
import {
	convertTldrawIdToSimpleId,
	convertTldrawShapeToFocusedType,
} from './convertTldrawShapeToFocusedShape'
export function convertTldrawShapeToBlurryShape(
	editor: Editor,
	shape: TLShape
): BlurryShape | null {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) return null

	return {
		x: Math.round(bounds.x),
		y: Math.round(bounds.y),
		w: Math.round(bounds.w),
		h: Math.round(bounds.h),
		type: convertTldrawShapeToFocusedType(shape),
		shapeId: convertTldrawIdToSimpleId(shape.id),
		text: editor.getShapeUtil(shape).getText(shape),
	}
}
