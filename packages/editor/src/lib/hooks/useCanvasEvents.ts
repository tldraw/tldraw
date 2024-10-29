import React, { useMemo } from 'react'
import { RIGHT_MOUSE_BUTTON } from '../constants'
import {
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
	stopEventPropagation,
} from '../utils/dom'
import { getPointerInfo } from '../utils/getPointerInfo'
import { useEditor } from './useEditor'

export function useCanvasEvents() {
	const editor = useEditor()

	const events = useMemo(
		function canvasEvents() {
			// Track the last screen point
			let lastX: number, lastY: number

			function onPointerDown(e: React.PointerEvent) {
				if ((e as any).isKilled) return

				if (e.button === RIGHT_MOUSE_BUTTON) {
					editor.dispatch({
						type: 'pointer',
						target: 'canvas',
						name: 'right_click',
						...getPointerInfo(e),
					})
					return
				}

				if (e.button !== 0 && e.button !== 1 && e.button !== 5) return

				setPointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_down',
					...getPointerInfo(e),
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
					...getPointerInfo(e),
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
					...getPointerInfo(e),
				})
			}

			function onPointerEnter(e: React.PointerEvent) {
				if ((e as any).isKilled) return
				if (editor.getInstanceState().isPenMode && e.pointerType !== 'pen') return
				const canHover = e.pointerType === 'mouse' || e.pointerType === 'pen'
				editor.updateInstanceState({ isHoveringCanvas: canHover ? true : null })
			}

			function onPointerLeave(e: React.PointerEvent) {
				if ((e as any).isKilled) return
				if (editor.getInstanceState().isPenMode && e.pointerType !== 'pen') return
				const canHover = e.pointerType === 'mouse' || e.pointerType === 'pen'
				editor.updateInstanceState({ isHoveringCanvas: canHover ? false : null })
			}

			function onTouchStart(e: React.TouchEvent) {
				;(e as any).isKilled = true
				preventDefault(e)
			}

			function onTouchEnd(e: React.TouchEvent) {
				;(e as any).isKilled = true
				// check that e.target is an HTMLElement
				if (!(e.target instanceof HTMLElement)) return

				if (
					e.target.tagName !== 'A' &&
					e.target.tagName !== 'TEXTAREA' &&
					// When in EditingShape state, we are actually clicking on a 'DIV'
					// not A/TEXTAREA element yet. So, to preserve cursor position
					// for edit mode on mobile we need to not preventDefault.
					// TODO: Find out if we still need this preventDefault in general though.
					!(editor.getEditingShape() && e.target.className.includes('tl-text-content'))
				) {
					preventDefault(e)
				}
			}

			function onDragOver(e: React.DragEvent<Element>) {
				preventDefault(e)
			}

			async function onDrop(e: React.DragEvent<Element>) {
				preventDefault(e)
				stopEventPropagation(e)
				if (!e.dataTransfer?.files?.length) return

				const files = Array.from(e.dataTransfer.files)

				await editor.putExternalContent({
					type: 'files',
					files,
					point: editor.screenToPage({ x: e.clientX, y: e.clientY }),
					ignoreParent: false,
				})
			}

			function onClick(e: React.MouseEvent) {
				stopEventPropagation(e)
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
				onClick,
			}
		},
		[editor]
	)

	return events
}
