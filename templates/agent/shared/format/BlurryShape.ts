import { Editor, TLDefaultShape, TLShape } from 'tldraw'
import { convertTldrawTypeToSimpleType } from './SimpleGeoShapeType'
import { convertTldrawIdToSimpleId, ISimpleShape } from './SimpleShape'

export interface BlurryShape {
	shapeId: string
	text?: string
	type: ISimpleShape['_type']
	x: number
	y: number
	w: number
	h: number
}

// right now we're only doing this conversion to shapes in the viewport
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
