import type React from 'react'
import { tlenv } from '../globals/environment'

/**
 * Decide whether a pen pointer event looks like direct manipulation on the display (e.g. Apple
 * Pencil on an iPad or a Surface Pen on a touchscreen) rather than indirect input from a desktop
 * graphics tablet (e.g. a Wacom Intuos).
 *
 * Direct-manipulation pointers receive implicit pointer capture on `pointerdown`, so if the
 * pointerdown's `target` already holds the capture before we take explicit capture ourselves, we
 * treat it as a direct-display pen. This must be checked before calling {@link setPointerCapture}.
 *
 * Implicit capture is applied to the event's `target` (the hit element), not its `currentTarget`
 * (the canvas element the listener is bound to), so we must check `target` here.
 *
 * @internal
 */
export function isDirectDisplayPen(e: React.PointerEvent | PointerEvent): boolean {
	if (e.pointerType !== 'pen') return false
	const target = e.target
	if (!target || typeof (target as Element).hasPointerCapture !== 'function') return false
	return (target as Element).hasPointerCapture(e.pointerId)
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
