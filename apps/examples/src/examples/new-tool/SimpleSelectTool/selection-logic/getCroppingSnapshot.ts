import { Editor, SelectionHandle, TLImageShape, Vec } from 'tldraw'

export function getCroppingSnapshot(editor: Editor, handle: SelectionHandle) {
	const selectionRotation = editor.getSelectionRotation()
	const {
		inputs: { originPagePoint },
	} = editor

	const shape = editor.getOnlySelectedShape() as TLImageShape

	const selectionBounds = editor.getSelectionRotatedPageBounds()!

	const dragHandlePoint = Vec.RotWith(
		selectionBounds.getHandlePoint(handle),
		selectionBounds.point,
		selectionRotation
	)

	const cursorHandleOffset = Vec.Sub(originPagePoint, dragHandlePoint)

	return {
		shape,
		cursorHandleOffset,
	}
}
