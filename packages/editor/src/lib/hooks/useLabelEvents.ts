import { TLShapeId } from '@tldraw/tlschema'
import React from 'react'
import { preventDefault } from '../utils/dom'
import { getShapePointerEventHandler } from './shared'
import { useEditor } from './useEditor'

export function useLabelEvents(id: TLShapeId) {
	const editor = useEditor()

	return React.useMemo(() => {
		function onTouchStart(e: React.TouchEvent) {
			;(e as any).isKilled = true
			preventDefault(e)
		}

		function onTouchEnd(e: React.TouchEvent) {
			;(e as any).isKilled = true
			preventDefault(e)
		}

		const handlePointerMove = getShapePointerEventHandler(editor, id, 'label', 'pointer_move')

		// Track the last screen point
		let lastX: number, lastY: number

		function onPointerMove(e: React.PointerEvent) {
			if ((e as any).isKilled) return
			if (e.clientX === lastX && e.clientY === lastY) return
			lastX = e.clientX
			lastY = e.clientY

			return handlePointerMove(e)
		}

		return {
			onPointerDown: getShapePointerEventHandler(editor, id, 'label', 'pointer_down'),
			onPointerUp: getShapePointerEventHandler(editor, id, 'label', 'pointer_up'),
			onPointerEnter: getShapePointerEventHandler(editor, id, 'label', 'pointer_enter'),
			onPointerLeave: getShapePointerEventHandler(editor, id, 'label', 'pointer_leave'),
			onPointerMove,
			onTouchStart,
			onTouchEnd,
		}
	}, [editor, id])
}
