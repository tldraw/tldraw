/**
 * iOS opens the software keyboard only for a focus that runs inside a user gesture's own task. A
 * focus scheduled for a later frame still moves the caret, so a field can look ready while
 * swallowing every keystroke until the reader taps it a second time.
 *
 * This covers the case where a field is mounted *during* a press — the comment composer opens on
 * pointer down and settles its anchor on pointer up — by running `focus` from the native pointerup
 * that ends the same gesture. That is late enough to survive the canvas taking focus for itself on
 * pointer down, and still inside the gesture, so iOS raises the keyboard.
 *
 * A pointerdown arriving first means the mounting gesture had already ended (a field opened from a
 * button, say), so the next release belongs to an unrelated gesture: give up rather than pull the
 * caret somewhere the reader didn't ask for.
 *
 * Returns a function that detaches the listeners; safe to call more than once.
 */
export function focusOnGestureEnd(doc: Document, focus: () => void): () => void {
	const stop = () => {
		doc.removeEventListener('pointerup', onPointerUp, true)
		doc.removeEventListener('pointerdown', stop, true)
	}
	function onPointerUp() {
		stop()
		focus()
	}
	doc.addEventListener('pointerup', onPointerUp, true)
	doc.addEventListener('pointerdown', stop, true)
	return stop
}
