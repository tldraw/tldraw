import { Editor, TLShape } from 'tldraw'

export function convertTldrawShapeToPeripheralShape(shape: TLShape, editor: Editor) {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) return
	return {
		x: bounds.x,
		y: bounds.y,
		w: bounds.w,
		h: bounds.h,
	}
}
