import { BoxModel, Editor, TLGeoShapeProps, TLShape } from 'tldraw'
import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { removeShapeIdPrefix } from '../AgentTransform'

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

	const shapeType = shape.type === 'geo' ? (shape.props as TLGeoShapeProps).geo : shape.type

	return {
		x: bounds.x,
		y: bounds.y,
		w: bounds.w,
		h: bounds.h,
		type: shapeType as ISimpleShape['_type'],
		shapeId: removeShapeIdPrefix(shape.id),
		text,
	}
}
