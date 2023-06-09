import { TLShapeId } from '@tldraw/tlschema'
import React from 'react'
import { Editor } from '../editor/Editor'
import { TLPointerEventName } from '../editor/types/event-types'
import { preventDefault, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/svg'
import { useEditor } from './useEditor'

const pointerEventHandler = (editor: Editor, shapeId: TLShapeId, name: TLPointerEventName) => {
	return (e: React.PointerEvent) => {
		if (name !== 'pointer_move' && editor.pageState.editingId === shapeId)
			(e as any).isKilled = true
		if ((e as any).isKilled) return

		switch (name) {
			case 'pointer_down': {
				if (e.button !== 0 && e.button !== 1 && e.button !== 2) return
				setPointerCapture(e.currentTarget, e)
				break
			}
			case 'pointer_up': {
				releasePointerCapture(e.currentTarget, e)
				break
			}
		}

		const shape = editor.getShapeById(shapeId)

		if (!shape) {
			console.error('Shape not found', shapeId)
			return
		}

		editor.dispatch({
			type: 'pointer',
			target: 'shape',
			shape,
			name,
			...getPointerInfo(e, editor.getContainer()),
		})
	}
}

export function useShapeEvents(id: TLShapeId) {
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

		const handlePointerMove = pointerEventHandler(editor, id, 'pointer_move')

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
			onPointerDown: pointerEventHandler(editor, id, 'pointer_down'),
			onPointerUp: pointerEventHandler(editor, id, 'pointer_up'),
			onPointerEnter: pointerEventHandler(editor, id, 'pointer_enter'),
			onPointerLeave: pointerEventHandler(editor, id, 'pointer_leave'),
			onPointerMove,
			onTouchStart,
			onTouchEnd,
		}
	}, [editor, id])
}
