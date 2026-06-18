import type React from 'react'
import { tlenv } from '../globals/environment'

/**
 * Decide whether a pen pointer event looks like direct manipulation on the display (e.g. Apple
 * Pencil on an iPad or a Surface Pen on a touchscreen) rather than indirect input from a desktop
 * graphics tablet (e.g. a Wacom Intuos).
 *
 * Direct-manipulation pointers receive implicit pointer capture on `pointerdown`, so if an element
 * already holds the capture before we take explicit capture ourselves, we treat it as a
 * direct-display pen. This must be checked before calling {@link setPointerCapture}.
 *
 * Per the spec, implicit capture is applied to the event's `target` (the hit element), but browsers
 * differ in practice — WebKit in particular has quirks around where implicit capture lands relative
 * to ancestors — so we check both the `target` and the `currentTarget` the listener is bound to. An
 * indirect tablet stylus receives no implicit capture on either, so this stays false for it.
 *
 * @internal
 */
export function isDirectDisplayPen(e: React.PointerEvent | PointerEvent): boolean {
	if (e.pointerType !== 'pen') return false
	for (const el of [e.target, e.currentTarget]) {
		if (
			el &&
			typeof (el as Element).hasPointerCapture === 'function' &&
			(el as Element).hasPointerCapture(e.pointerId)
		) {
			return true
		}
	}
	return false
}

/** @internal */
interface PointerLike {
	button: number
	ctrlKey: boolean
	metaKey: boolean
}

/** @internal */
export function isSecondaryClickEvent(e: PointerLike) {
	return e.button === 2 || (tlenv.isDarwin && e.button === 0 && e.ctrlKey && !e.metaKey)
}

/** @internal */
export function getPointerEventButton(e: PointerLike) {
	return isSecondaryClickEvent(e) ? 2 : e.button
}
