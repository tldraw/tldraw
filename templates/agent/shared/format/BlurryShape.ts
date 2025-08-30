import { BoxModel, Editor, TLDefaultShape, TLShape } from 'tldraw'
import { removeShapeIdPrefix } from '../AgentTransform'
import { convertTldrawGeoShapeGeoStyleOrUnknownToSimpleGeoShapeTypeIfNeeded } from './SimpleGeoShapeType'
import { ISimpleShape } from './SimpleShape'

export type BlurryShape = BoxModel & {
	type: ISimpleShape['_type']
	shapeId: string
	text?: string
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

	const shapeType = convertTldrawGeoShapeGeoStyleOrUnknownToSimpleGeoShapeTypeIfNeeded(
		shape.type as TLDefaultShape['type'] | 'unknown'
	)

	return {
		x: Math.round(bounds.x),
		y: Math.round(bounds.y),
		w: Math.round(bounds.w),
		h: Math.round(bounds.h),
		type: shapeType as ISimpleShape['_type'],
		shapeId: removeShapeIdPrefix(shape.id),
		text,
	}
}
