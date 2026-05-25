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
	const currentPagePoint = editor.inputs.getCurrentPagePoint()
	const hitOptions = {
		hitInside: false,
		hitLabels: false,
		hitLocked: editor.options.selectLockedShapes,
		margin: editor.options.hitTestMargin / editor.getZoomLevel(),
		renderingOnly: true,
	} as const

	// Selection should win when stacked under another shape: if the pointer is
	// over a selected shape, prefer it over a non-selected shape on top.
	let hitShape: TLShape | undefined
	const selectedShapeIds = editor.getSelectedShapeIds()
	if (selectedShapeIds.length > 0) {
		hitShape = editor.getShapeAtPoint(currentPagePoint, {
			...hitOptions,
			filter: (shape) => selectedShapeIds.includes(shape.id),
		})
	}
	if (!hitShape) {
		hitShape = editor.getShapeAtPoint(currentPagePoint, hitOptions)
	}

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
	if (editor.isDisposed) return

	const cameraMoving = editor.getCameraState() === 'moving'

	if (!cameraMoving) {
		hoverLockedEditors.set(editor, false)
		const nextHoveredId = getShapeToHover(editor)
		return editor.setHoveredShape(nextHoveredId)
	}

	if (hoverLockedEditors.get(editor)) {
		return undefined
	}

	const currentHoveredId = editor.getHoveredShapeId()

	if (!currentHoveredId) {
		hoverLockedEditors.set(editor, true)
		return undefined
	}

	const nextHoveredId = getShapeToHover(editor)
	if (nextHoveredId === currentHoveredId) {
		return undefined
	}

	editor.setHoveredShape(null)
	hoverLockedEditors.set(editor, true)
	return undefined
}

const THROTTLE_MS = process.env.NODE_ENV === 'test' ? 0 : 32
const editorThrottles = new WeakMap<
	Editor,
	ReturnType<typeof throttle<typeof _updateHoveredShapeId>>
>()

function getThrottled(editor: Editor) {
	let throttled = editorThrottles.get(editor)
	if (!throttled) {
		throttled = throttle(_updateHoveredShapeId, THROTTLE_MS)
		editorThrottles.set(editor, throttled)
	}
	return throttled
}

/** @internal */
export function updateHoveredShapeId(editor: Editor) {
	getThrottled(editor)(editor)
}

/** @internal */
export function cancelUpdateHoveredShapeId(editor: Editor) {
	editorThrottles.get(editor)?.cancel()
}
