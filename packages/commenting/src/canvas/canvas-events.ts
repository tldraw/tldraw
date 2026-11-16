import { type PointerEvent as ReactPointerEvent } from 'react'
import { Editor, react, TLCursorType, unsafe__withoutCapture } from 'tldraw'

/** A pointer-down that belongs to the camera, not the comment UI: any non-primary button
 *  (middle/right-button pans), or a primary press with the spacebar pan key held. */
export function isCanvasPanGesture(editor: Editor, e: { button: number }) {
	return e.button !== 0 || editor.inputs.keys.has('Space')
}

/** Hand a pointer event to the canvas beneath the comments layer, marked the same way the
 *  pass-through wheel/hover hooks mark their re-dispatched events. */
export function forwardPointerEventToCanvas(container: HTMLElement, e: ReactPointerEvent) {
	const cvs = container.querySelector('.tl-canvas')
	if (!cvs) return
	const newEvent = new PointerEvent(e.type, e.nativeEvent as any)
	;(newEvent as any).isSpecialRedispatchedEvent = true
	cvs.dispatchEvent(newEvent)
}

/**
 * Start a comment drag (pin move or region resize) run by the comment UI's own pointer handlers
 * rather than a tool state. Shows `cursor` for the whole drag and re-runs `onCameraMove` when the
 * camera moves, from the drag's last pointer position, so a mid-drag scroll keeps the dragged thing
 * under the pointer as a shape drag does. Returns the cleanup.
 *
 * The drag's pointer moves still reach the editor (its inputs and the presence cursor others see
 * must keep tracking), so the active tool's hover handling may set its own cursor on each one; the
 * drag's cursor is put back whenever that happens.
 */
export function startCommentDrag(
	editor: Editor,
	{ cursor, onCameraMove }: { cursor: TLCursorType; onCameraMove(): void }
): () => void {
	const prevCursor = { ...editor.getInstanceState().cursor }
	const stopCursor = react('comment drag cursor', () => {
		if (editor.getInstanceState().cursor.type !== cursor) {
			editor.setCursor({ type: cursor, rotation: 0 })
		}
	})
	let started = false
	const stopCamera = react('comment drag follows camera', () => {
		editor.getCamera()
		if (!started) {
			started = true
			return
		}
		// Untracked: the callback writes state it may also read.
		unsafe__withoutCapture(onCameraMove)
	})
	return () => {
		stopCamera()
		stopCursor()
		editor.setCursor(prevCursor)
	}
}
