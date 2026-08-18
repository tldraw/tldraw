import { Editor, TLShapeId, throttle } from '@tldraw/editor'

/*
Hit-testing is expensive in large documents, so hover updates pause while the
camera moves:
1. Camera idle → update hover normally, unlock
2. Camera moving + locked → skip entirely (no hit-testing)
3. Camera moving + no current hover → lock immediately
4. Camera moving + same shape → keep current hover
5. Camera moving + different shape → clear hover and lock
*/
const hoverLockedEditors = new WeakSet<Editor>()

function getShapeToHover(editor: Editor): TLShapeId | null {
	const hitShape = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
		hitInside: false,
		hitLabels: false,
		hitLocked: editor.options.selectLockedShapes,
		margin: editor.getHitTestMargin(),
		renderingOnly: true,
	})

	if (!hitShape) return null

	const outermostShape = editor.getOutermostSelectableShape(hitShape)
	if (
		outermostShape === hitShape ||
		outermostShape.id === editor.getFocusedGroupId() ||
		editor.getSelectedShapeIds().includes(outermostShape.id)
	) {
		return hitShape.id
	}
	return outermostShape.id
}

function _updateHoveredShapeId(editor: Editor) {
	if (editor.isDisposed) return

	if (editor.getCameraState() !== 'moving') {
		hoverLockedEditors.delete(editor)
		editor.setHoveredShape(getShapeToHover(editor))
		return
	}

	if (hoverLockedEditors.has(editor)) return

	const currentHoveredId = editor.getHoveredShapeId()
	if (!currentHoveredId) {
		hoverLockedEditors.add(editor)
		return
	}

	if (getShapeToHover(editor) === currentHoveredId) return

	editor.setHoveredShape(null)
	hoverLockedEditors.add(editor)
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
