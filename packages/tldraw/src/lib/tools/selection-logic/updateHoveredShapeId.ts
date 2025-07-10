import { Editor, TLShape } from '@tldraw/editor'

function _updateHoveredShapeId(editor: Editor) {
	// todo: consider replacing `get hoveredShapeId` with this; it would mean keeping hoveredShapeId in memory rather than in the store and possibly re-computing it more often than necessary
	const hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
		hitInside: false,
		hitLabels: false,
		margin: editor.options.hitTestMargin / editor.getZoomLevel(),
		renderingOnly: true,
	})

	if (!hitShape) return editor.setHoveredShape(null)

	let shapeToHover: TLShape | undefined = undefined

	const outermostShape = editor.getOutermostSelectableShape(hitShape)

	if (outermostShape === hitShape) {
		shapeToHover = hitShape
	} else {
		if (
			outermostShape.id === editor.getFocusedGroupId() ||
			editor.getSelectedShapeIds().includes(outermostShape.id)
		) {
			shapeToHover = hitShape
		} else {
			shapeToHover = outermostShape
		}
	}

	return editor.setHoveredShape(shapeToHover.id)
}

export function getHoveredShapeIdUpdater(editor: Editor) {
	let last = 0

	function updateHoveredShapeId() {
		const now = Date.now()
		console.log(editor.inputs.pointerVelocity.len2())
		const frameLen = editor.inputs.pointerVelocity.len2() > 10 ? 64 : 32
		if (now - last < frameLen) return
		last = now
		_updateHoveredShapeId(editor)
	}

	return updateHoveredShapeId
}
