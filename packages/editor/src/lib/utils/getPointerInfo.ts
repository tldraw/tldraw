import { Editor } from '@tldraw/core'
import { isAccelKey } from '@tldraw/core'
import type React from 'react'
import { getPointerEventButton } from './pointer'

/** @public */
export function getPointerInfo(editor: Editor, e: React.PointerEvent | PointerEvent) {
	editor.markEventAsHandled(e)

	return {
		point: {
			x: e.clientX,
			y: e.clientY,
			z: e.pressure,
		},
		shiftKey: e.shiftKey,
		altKey: e.altKey,
		ctrlKey: e.metaKey || e.ctrlKey,
		metaKey: e.metaKey,
		accelKey: isAccelKey(e),
		pointerId: e.pointerId,
		button: getPointerEventButton(e),
		isPen: e.pointerType === 'pen',
	}
}
