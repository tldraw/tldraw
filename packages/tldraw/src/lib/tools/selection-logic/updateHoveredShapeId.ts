import { Editor, TLShape, TLShapeId, throttle } from '@tldraw/editor'

/*
Perf optimization: Skip hover updates while panning.

Hit-testing shapes is expensive in large documents. When panning, we don't need
continuous hover updates - we just need to resume when the camera stops.

The logic:
1. Camera idle → update hover normally, unlock
2. Camera moving + locked → skip entirely (no hit-testing)
3. Camera moving + no current hover → lock immediately
4. Camera moving + same shape → keep current hover (no change needed)
5. Camera moving + different shape → clear hover and lock

This means: when you start panning over a shape, it stays hovered until
your cursor moves off it, then hover clears and we stop hit-testing until
the camera stops.
*/

// Track per-editor state for hover updates during camera movement
const hoverLockedEditors = new WeakMap<Editor, boolean>()

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

	if (!cameraMoving) {
		hoverLockedEditors.set(editor, false)
		const nextHoveredId = getShapeToHover(editor)
		return editor.setHoveredShape(nextHoveredId)
	}

	if (hoverLockedEditors.get(editor)) {
		return
	}

	const currentHoveredId = editor.getHoveredShapeId()

	if (!currentHoveredId) {
		hoverLockedEditors.set(editor, true)
		return
	}

	const nextHoveredId = getShapeToHover(editor)
	if (nextHoveredId === currentHoveredId) {
		return
	}

	editor.setHoveredShape(null)
	hoverLockedEditors.set(editor, true)
}

/** @internal */
export const updateHoveredShapeId = throttle(
	_updateHoveredShapeId,
	process.env.NODE_ENV === 'test' ? 0 : 32
)
