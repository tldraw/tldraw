import { Editor, Vec, VecLike, pointInPolygon } from 'tldraw'

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
