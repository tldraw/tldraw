import { Editor, TLShape, throttle } from '@tldraw/editor'

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

/** @internal */
export const updateHoveredShapeId = throttle(
	_updateHoveredShapeId,
	process.env.NODE_ENV === 'test' ? 0 : 32
)
