import { Editor, HIT_TEST_MARGIN, TLShape } from '@tldraw/editor'

export function updateHoveredId(editor: Editor) {
	// todo: consider replacing `get hoveredId` with this; it would mean keeping hoveredId in memory rather than in the store and possibly re-computing it more often than necessary
	const hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
		hitInside: false,
		margin: HIT_TEST_MARGIN / editor.zoomLevel,
	})
	if (!hitShape) return editor.setHoveredId(null)

	let shapeToHover: TLShape | undefined = undefined

	const outermostShape = editor.getOutermostSelectableShape(hitShape)

	if (outermostShape === hitShape) {
		shapeToHover = hitShape
	} else {
		if (
			outermostShape.id === editor.focusLayerId ||
			editor.selectedIds.includes(outermostShape.id)
		) {
			shapeToHover = hitShape
		} else {
			shapeToHover = outermostShape
		}
	}

	return editor.setHoveredId(shapeToHover.id)
}
