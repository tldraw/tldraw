import { TLShapeId } from '@tldraw/tlschema'
import React from 'react'
import { App } from '../app/App'
import { TLPointerEventName } from '../app/types/event-types'
import { preventDefault, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/svg'
import { useApp } from './useApp'

const pointerEventHandler = (
	app: App,
	shapeId: TLShapeId,
	name: TLPointerEventName,
	capturedPointerIdLookup: Set<string>
) => {
	return (e: React.PointerEvent) => {
		if (app.pageState.editingId === shapeId) (e as any).isKilled = true
		if ((e as any).isKilled) return

		let pointerInfo = getPointerInfo(e, app.getContainer())

		switch (name) {
			case 'pointer_down': {
				if (e.button !== 0 && e.button !== 1 && e.button !== 2) return
				setPointerCapture(e.currentTarget, e)
				if (e.button === 0) {
					capturedPointerIdLookup.add(`pointer_down:${e.pointerId}:0`)
				}
				break
			}
			case 'pointer_up': {
				const key = `pointer_down:${e.pointerId}:0`
				// Due to an issue with how firefox handles click events, see <https://linear.app/tldraw/issue/TLD-1056/firefox-pointer-events-do-not-fire-when-control-clicking>
				if (capturedPointerIdLookup.has(key)) {
					// Because we've tracked the pointer event as a pointer_down with button 0, we can assume this is the invalid right click FF issue.
					pointerInfo = {
						...pointerInfo,
						button: 0,
					}
					capturedPointerIdLookup.delete(key)
				}
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
			...pointerInfo,
		})
	}
}

export function useShapeEvents(id: TLShapeId) {
	const app = useApp()

	return React.useMemo(() => {
		const capturedPointerIdLookup = new Set<string>()
		function onTouchStart(e: React.TouchEvent) {
			;(e as any).isKilled = true
			preventDefault(e)
		}

		function onTouchEnd(e: React.TouchEvent) {
			;(e as any).isKilled = true
			preventDefault(e)
		}

		const handlePointerMove = pointerEventHandler(app, id, 'pointer_move', capturedPointerIdLookup)

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
			onPointerDown: pointerEventHandler(app, id, 'pointer_down', capturedPointerIdLookup),
			onPointerUp: pointerEventHandler(app, id, 'pointer_up', capturedPointerIdLookup),
			onPointerEnter: pointerEventHandler(app, id, 'pointer_enter', capturedPointerIdLookup),
			onPointerLeave: pointerEventHandler(app, id, 'pointer_leave', capturedPointerIdLookup),
			onPointerMove,
			onTouchStart,
			onTouchEnd,
		}
	}, [app, id])
}
