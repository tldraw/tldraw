import { useValue } from '@tldraw/state-react'
import React, { useEffect, useMemo } from 'react'
import { RIGHT_MOUSE_BUTTON } from '../constants'
import { preventDefault, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/getPointerInfo'
import { useEditor } from './useEditor'

export function useCanvasEvents() {
	const editor = useEditor()
	const currentTool = useValue('current tool', () => editor.getCurrentTool(), [editor])

	const events = useMemo(
		function canvasEvents() {
			function onPointerDown(e: React.PointerEvent) {
				if (editor.wasEventAlreadyHandled(e)) return

				if (e.button === RIGHT_MOUSE_BUTTON) {
					editor.dispatch({
						type: 'pointer',
						target: 'canvas',
						name: 'right_click',
						...getPointerInfo(editor, e),
					})
					return
				}

				if (e.button !== 0 && e.button !== 1 && e.button !== 5) return

				setPointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_down',
					...getPointerInfo(editor, e),
				})
			}

			function onPointerUp(e: React.PointerEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				if (e.button !== 0 && e.button !== 1 && e.button !== 2 && e.button !== 5) return

				releasePointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_up',
					...getPointerInfo(editor, e),
				})
			}

			function onPointerEnter(e: React.PointerEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				if (editor.getInstanceState().isPenMode && e.pointerType !== 'pen') return
				const canHover = e.pointerType === 'mouse' || e.pointerType === 'pen'
				editor.updateInstanceState({ isHoveringCanvas: canHover ? true : null })
			}

			function onPointerLeave(e: React.PointerEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				if (editor.getInstanceState().isPenMode && e.pointerType !== 'pen') return
				const canHover = e.pointerType === 'mouse' || e.pointerType === 'pen'
				editor.updateInstanceState({ isHoveringCanvas: canHover ? false : null })
			}

			function onTouchStart(e: React.TouchEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				editor.markEventAsHandled(e)
				preventDefault(e)
			}

			function onTouchEnd(e: React.TouchEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				editor.markEventAsHandled(e)
				// check that e.target is an HTMLElement
				if (!(e.target instanceof HTMLElement)) return

				const editingShapeId = editor.getEditingShape()?.id
				if (
					// if the target is not inside the editing shape
					!(editingShapeId && e.target.closest(`[data-shape-id="${editingShapeId}"]`)) &&
					// and the target is not an clickable element
					e.target.tagName !== 'A' &&
					// or a TextArea.tsx ?
					e.target.tagName !== 'TEXTAREA' &&
					!e.target.isContentEditable
				) {
					preventDefault(e)
				}
			}

			function onDragOver(e: React.DragEvent<Element>) {
				if (editor.wasEventAlreadyHandled(e)) return
				preventDefault(e)
			}

			async function onDrop(e: React.DragEvent<Element>) {
				if (editor.wasEventAlreadyHandled(e)) return
				preventDefault(e)
				e.stopPropagation()

				if (e.dataTransfer?.files?.length) {
					const files = Array.from(e.dataTransfer.files)

					await editor.putExternalContent({
						type: 'files',
						files,
						point: editor.screenToPage({ x: e.clientX, y: e.clientY }),
					})
					return
				}

				const url = e.dataTransfer.getData('url')
				if (url) {
					await editor.putExternalContent({
						type: 'url',
						url,
						point: editor.screenToPage({ x: e.clientX, y: e.clientY }),
					})
					return
				}
			}

			function onClick(e: React.MouseEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				e.stopPropagation()
			}

			return {
				onPointerDown,
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

	// onPointerMove is special: where we're only interested in the other events when they're
	// happening _on_ the canvas (as opposed to outside of it, or on UI floating over it), we want
	// the pointer position to be up to date regardless of whether it's over the tldraw canvas or
	// not. So instead of returning a listener to be attached to the canvas, we directly attach a
	// listener to the whole document instead.
	useEffect(() => {
		let lastX: number, lastY: number

		function onPointerMove(e: PointerEvent) {
			if (editor.wasEventAlreadyHandled(e)) return
			editor.markEventAsHandled(e)

			if (e.clientX === lastX && e.clientY === lastY) return
			lastX = e.clientX
			lastY = e.clientY

			// For tools that benefit from a higher fidelity of events,
			// we dispatch the coalesced events.
			// N.B. Sometimes getCoalescedEvents isn't present on iOS, ugh.
			const events =
				currentTool.useCoalescedEvents && e.getCoalescedEvents ? e.getCoalescedEvents() : [e]
			for (const singleEvent of events) {
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_move',
					...getPointerInfo(editor, singleEvent),
				})
			}
		}

		document.body.addEventListener('pointermove', onPointerMove)
		return () => {
			document.body.removeEventListener('pointermove', onPointerMove)
		}
	}, [editor, currentTool])

	return events
}
