import { VecLike, pointInPolygon, Vec, Editor } from '@tldraw/editor'

export function isPointInRotatedSelectionBounds(editor: Editor, point: VecLike) {
	const selectionBounds = editor.getSelectionRotatedPageBounds()
	if (!selectionBounds) return false

	const selectionRotation = editor.getSelectionRotation()
	if (!selectionRotation) return selectionBounds.containsPoint(point)

	return pointInPolygon(
		point,
		selectionBounds.corners.map((c) => Vec.RotWith(c, selectionBounds.point, selectionRotation))
	)
}

export function isPointInPointableSelectionBounds(editor: Editor, point: VecLike) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	if (selectedShapeIds.length === 0) return false

	if (selectedShapeIds.length === 1) {
		const onlySelectedShape = editor.getOnlySelectedShape()
		if (!onlySelectedShape) return false

		if (editor.getShapeUtil(onlySelectedShape).hideSelectionBoundsBg(onlySelectedShape)) {
			return false
		}
	}

	return isPointInRotatedSelectionBounds(editor, point)
}
