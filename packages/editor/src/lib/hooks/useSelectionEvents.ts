import { useMemo } from 'react'
import { TLSelectionHandle } from '../app/types/selection-types'
import { loopToHtmlElement, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/svg'
import { useApp } from './useEditor'

export function useSelectionEvents(handle: TLSelectionHandle) {
	const app = useApp()

	const events = useMemo(
		function selectionEvents() {
			const onPointerDown: React.PointerEventHandler = (e) => {
				if ((e as any).isKilled) return
				if (e.button !== 0) return

				// Because the events are probably set on SVG elements,
				// we need to instead place pointer capture on the first HTML
				// element above the event's target; and set a listener to
				// remove pointer capture when the pointer is released.

				const elm = loopToHtmlElement(e.currentTarget)

				function releaseCapture() {
					elm.removeEventListener('pointerup', releaseCapture)
					releasePointerCapture(elm, e)
				}

				setPointerCapture(elm, e)
				elm.addEventListener('pointerup', releaseCapture)

				app.dispatch({
					name: 'pointer_down',
					type: 'pointer',
					target: 'selection',
					handle,
					...getPointerInfo(e, app.getContainer()),
				})
				e.stopPropagation()
			}

			// Track the last screen point
			let lastX: number, lastY: number

			function onPointerMove(e: React.PointerEvent) {
				if ((e as any).isKilled) return
				if (e.button !== 0) return
				if (e.clientX === lastX && e.clientY === lastY) return
				lastX = e.clientX
				lastY = e.clientY

				app.dispatch({
					name: 'pointer_move',
					type: 'pointer',
					target: 'selection',
					handle,
					...getPointerInfo(e, app.getContainer()),
				})
			}

			const onPointerUp: React.PointerEventHandler = (e) => {
				if ((e as any).isKilled) return
				if (e.button !== 0) return

				app.dispatch({
					name: 'pointer_up',
					type: 'pointer',
					target: 'selection',
					handle,
					...getPointerInfo(e, app.getContainer()),
				})
			}

			return {
				onPointerDown,
				onPointerMove,
				onPointerUp,
			}
		},
		[app, handle]
	)

	return events
}
