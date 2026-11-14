import { type PointerEvent as ReactPointerEvent } from 'react'
import { Editor, react, TLCursorType, unsafe__withoutCapture } from 'tldraw'

/** A pointer-down that belongs to the camera, not the comment UI: any non-primary button
 *  (middle/right-button pans), or a primary press with the spacebar pan key held. */
export function isCanvasPanGesture(editor: Editor, e: ReactPointerEvent) {
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
 * Start a comment drag (a pin move or a region resize) run by the comment UI's own pointer
 * handlers rather than a tool state. Shows `cursor` on the editor for the whole drag, and re-runs
 * `onCameraMove` whenever the camera moves (a wheel scroll mid-drag), so the drag keeps tracking the
 * pointer's page position as a shape drag does instead of waiting for the next pointer move.
 * Returns the cleanup.
 *
 * The dragged element's own CSS cursor only applies while the pointer is over it, so without the
 * editor cursor a drag that outruns it shows whatever cursor the canvas underneath has.
 */
export function startCommentDrag(
	editor: Editor,
	{ cursor, onCameraMove }: { cursor: TLCursorType; onCameraMove(): void }
): () => void {
	const prevCursor = { ...editor.getInstanceState().cursor }
	editor.setCursor({ type: cursor, rotation: 0 })
	let started = false
	const stop = react('comment drag follows camera', () => {
		editor.getCamera()
		if (!started) {
			started = true
			return
		}
		// Untracked: the callback writes state it may also read.
		unsafe__withoutCapture(onCameraMove)
	})
	return () => {
		stop()
		editor.setCursor(prevCursor)
	}
}
