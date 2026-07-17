import type React from 'react'
import { tlenv } from '../globals/environment'

/**
 * Decide whether a pen pointer event looks like direct manipulation on the display (e.g. Apple
 * Pencil on an iPad or a Surface Pen on a touchscreen) rather than indirect input from a desktop
 * graphics tablet (e.g. a Wacom Intuos).
 *
 * We can't tell the two apart from the pointer event itself: both report `pointerType: 'pen'`, and
 * implicit pointer capture — which in theory distinguishes direct-manipulation pointers — isn't
 * reliably observable across browsers (notably WebKit/iPad). Instead we key off the device: a
 * direct-display pen draws on a touch-capable screen, while an indirect graphics tablet is used on
 * a non-touch desktop alongside a mouse. A device with no touch input therefore can't host a
 * direct-display pen.
 *
 * Note this uses {@link tlenv.isTouchDevice} — the device's fixed touch capability — not the
 * editor's dynamic `isCoarsePointer` state, which a pen `pointerdown` flips to coarse regardless
 * of device.
 *
 * @internal
 */
export function isDirectDisplayPen(e: React.PointerEvent | PointerEvent): boolean {
	if (e.pointerType !== 'pen') return false
	return tlenv.isTouchDevice
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
