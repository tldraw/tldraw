import { type PointerEvent as ReactPointerEvent } from 'react'
import { Editor } from 'tldraw'

/** A pointer-down that belongs to the camera, not the comment UI: any non-primary button
 *  (middle/right-button pans), or a primary press with the spacebar pan key held. */
export function isCanvasPanGesture(editor: Editor, e: ReactPointerEvent) {
	return e.button !== 0 || editor.inputs.keys.has('Space')
}

/** Commenting UI that holds focus drops it to <body> when it unmounts. From there tool shortcuts
 *  still fire but the editor's Escape listener (on its container) doesn't, so you could press C and
 *  then not leave the comment tool (#11293). Call this when that UI closes. */
export function returnFocusToEditor(editor: Editor) {
	editor.getContainer().focus({ preventScroll: true })
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
