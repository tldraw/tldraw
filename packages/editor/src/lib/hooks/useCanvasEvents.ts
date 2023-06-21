import React, { useMemo } from 'react'
import { preventDefault, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/svg'
import { useEditor } from './useEditor'

export function useCanvasEvents() {
	const editor = useEditor()

	const events = useMemo(
		function canvasEvents() {
			// Track the last screen point
			let lastX: number, lastY: number

			function onPointerDown(e: React.PointerEvent) {
				if ((e as any).isKilled) return
				if (e.button !== 0 && e.button !== 1 && e.button !== 5) return

				setPointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_down',
					...getPointerInfo(e, editor.getContainer()),
				})
			}

			function onPointerMove(e: React.PointerEvent) {
				if ((e as any).isKilled) return

				if (e.clientX === lastX && e.clientY === lastY) return
				lastX = e.clientX
				lastY = e.clientY

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_move',
					...getPointerInfo(e, editor.getContainer()),
				})
			}

			function onPointerUp(e: React.PointerEvent) {
				if ((e as any).isKilled) return
				if (e.button !== 0 && e.button !== 1 && e.button !== 2 && e.button !== 5) return
				lastX = e.clientX
				lastY = e.clientY

				releasePointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_up',
					...getPointerInfo(e, editor.getContainer()),
				})
			}

			function onPointerEnter(e: React.PointerEvent) {
				if ((e as any).isKilled) return

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_enter',
					...getPointerInfo(e, editor.getContainer()),
				})
			}

			function onPointerLeave(e: React.PointerEvent) {
				if ((e as any).isKilled) return

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_leave',
					...getPointerInfo(e, editor.getContainer()),
				})
			}

			function onTouchStart(e: React.TouchEvent) {
				;(e as any).isKilled = true
				document.body.click() // god damn it, but necessary for long presses to open the context menu
				preventDefault(e)
			}

			function onTouchEnd(e: React.TouchEvent) {
				;(e as any).isKilled = true
				if (
					(e.target as HTMLElement).tagName !== 'A' &&
					(e.target as HTMLElement).tagName !== 'TEXTAREA'
				) {
					preventDefault(e)
				}
			}

			function onDragOver(e: React.DragEvent<Element>) {
				preventDefault(e)
			}

			async function onDrop(e: React.DragEvent<Element>) {
				preventDefault(e)
				if (!e.dataTransfer?.files?.length) return

				const files = Array.from(e.dataTransfer.files)

				const rect = editor.getContainer().getBoundingClientRect()

				await editor.putExternalContent({
					type: 'files',
					files,
					point: editor.screenToPage(e.clientX - rect.x, e.clientY - rect.y),
					ignoreParent: false,
				})
			}

			return {
				onPointerDown,
				onPointerMove,
				onPointerUp,
				onPointerEnter,
				onPointerLeave,
				onDragOver,
				onDrop,
				onTouchStart,
				onTouchEnd,
			}
		},
		[editor]
	)

	return events
}
