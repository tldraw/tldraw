import { Editor, TLShape } from '@tldraw/editor'

export function getHitShapeOnCanvasPointerDown(editor: Editor): TLShape | undefined {
	const hovered = editor.getHovered()
	if (!hovered) {
		return editor.getSelectedShapeAtPoint(editor.inputs.currentPagePoint)
	}
	if (hovered.type !== 'shape') {
		return undefined
	}
	return hovered.shape
}
