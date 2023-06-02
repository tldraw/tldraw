import { TLShapeId } from '@tldraw/tlschema'
import React from 'react'
import { App } from '../app/App'
import { TLPointerEventName } from '../app/types/event-types'
import { preventDefault, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/svg'
import { useApp } from './useEditor'

const pointerEventHandler = (app: App, shapeId: TLShapeId, name: TLPointerEventName) => {
	return (e: React.PointerEvent) => {
		if (name !== 'pointer_move' && app.pageState.editingId === shapeId) (e as any).isKilled = true
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

		const shape = app.getShapeById(shapeId)

		if (!shape) {
			console.error('Shape not found', shapeId)
			return
		}

		app.dispatch({
			type: 'pointer',
			target: 'shape',
			shape,
			name,
			...getPointerInfo(e, app.getContainer()),
		})
	}
}

export function useShapeEvents(id: TLShapeId) {
	const app = useApp()

	return React.useMemo(() => {
		function onTouchStart(e: React.TouchEvent) {
			;(e as any).isKilled = true
			preventDefault(e)
		}

		function onTouchEnd(e: React.TouchEvent) {
			;(e as any).isKilled = true
			preventDefault(e)
		}

		const handlePointerMove = pointerEventHandler(app, id, 'pointer_move')

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
			onPointerDown: pointerEventHandler(app, id, 'pointer_down'),
			onPointerUp: pointerEventHandler(app, id, 'pointer_up'),
			onPointerEnter: pointerEventHandler(app, id, 'pointer_enter'),
			onPointerLeave: pointerEventHandler(app, id, 'pointer_leave'),
			onPointerMove,
			onTouchStart,
			onTouchEnd,
		}
	}, [app, id])
}
