import { Editor, TLShape, TLShapeId, throttle } from '@tldraw/editor'

// Track per-editor state for hover updates during camera movement
const hoverLocked = new WeakMap<Editor, boolean>()

function getShapeToHover(editor: Editor): TLShapeId | null {
	const hitShape = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
		hitInside: false,
		hitLabels: false,
		margin: editor.options.hitTestMargin / editor.getZoomLevel(),
		renderingOnly: true,
	})

	if (!hitShape) return null

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

	return shapeToHover.id
}

function _updateHoveredShapeId(editor: Editor) {
	const cameraMoving = editor.getCameraState() === 'moving'

	if (cameraMoving) {
		// If hover is locked, skip updates while camera is moving
		if (hoverLocked.get(editor)) {
			return
		}

		// Check if hover would change
		const nextHoveredId = getShapeToHover(editor)
		const currentHoveredId = editor.getHoveredShapeId()

		if (nextHoveredId !== currentHoveredId) {
			// Hover would change while camera is moving - lock hover updates
			hoverLocked.set(editor, true)
			return
		}

		// Hover unchanged, allow it
		return editor.setHoveredShape(nextHoveredId)
	} else {
		// Camera is idle - unlock and update hover
		hoverLocked.set(editor, false)
		const nextHoveredId = getShapeToHover(editor)
		return editor.setHoveredShape(nextHoveredId)
	}
}

/** @internal */
export const updateHoveredShapeId = throttle(
	_updateHoveredShapeId,
	process.env.NODE_ENV === 'test' ? 0 : 32
)
