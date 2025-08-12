import { BoxModel, Editor, TLShape } from 'tldraw'

export function convertShapeToPeripheralContent(shape: TLShape, editor: Editor): BoxModel | null {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) return null
	return {
		x: bounds.x,
		y: bounds.y,
		w: bounds.w,
		h: bounds.h,
	}
}
