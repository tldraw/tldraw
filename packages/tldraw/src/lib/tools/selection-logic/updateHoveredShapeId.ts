import { Editor, TLShape, Vec, throttle } from '@tldraw/editor'

const _prevPagePoint = new Vec(-1, -1)

function _updateHoveredShapeId(editor: Editor) {
	// if the pointer has moved less than 0.05 units, don't update the hovered shape id
	const currentPagePoint = editor.inputs.getCurrentPagePoint()
	if (Vec.Dist(_prevPagePoint, currentPagePoint) < 0.05) return
	_prevPagePoint.setTo(currentPagePoint)

	// todo: consider replacing `get hoveredShapeId` with this; it would mean keeping hoveredShapeId in memory rather than in the store and possibly re-computing it more often than necessary
	const hitShape = editor.getShapeAtPoint(currentPagePoint, {
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
