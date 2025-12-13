import { useValue } from '@tldraw/state-react'
import React, { useEffect, useMemo, useRef } from 'react'
import { tlenv } from '../globals/environment'
import { preventDefault, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/getPointerInfo'
import { useEditor } from './useEditor'

export function useCanvasEvents() {
	const editor = useEditor()
	const ownerDocument = editor.getContainer().ownerDocument
	const currentTool = useValue('current tool', () => editor.getCurrentTool(), [editor])

	// Track if pointer has moved during drag
	const pointerMovedRef = useRef(true)

	const events = useMemo(
		function canvasEvents() {
			function onPointerDown(e: React.PointerEvent) {
				if (editor.wasEventAlreadyHandled(e)) return

				// to drag on right click if the option is enabled
				pointerMovedRef.current = true
				if (e.button == 2) {
					if (editor.user.getIsRightClickToDrag()) {
						setPointerCapture(e.currentTarget, e)
						editor.dispatch({
							type: 'pointer',
							target: 'canvas',
							name: 'pointer_down',
							...getPointerInfo(editor, e),
						})
					} else {
						editor.dispatch({
							type: 'pointer',
							target: 'canvas',
							name: 'right_click',
							...getPointerInfo(editor, e),
						})
					}
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
				if (e.button !== 0 && e.button !== 1 && e.button !== 5 && e.button !== 2) return

				// check if pointer moved since pointer down
				if (
					e.button == 2 &&
					editor.inputs.currentScreenPoint.x === editor.inputs.originScreenPoint.x &&
					editor.inputs.currentScreenPoint.y === editor.inputs.originScreenPoint.y
				) {
					pointerMovedRef.current = false
					const contextMenuEvent = new MouseEvent('contextmenu', {
						bubbles: true,
						cancelable: true,
						clientX: e.clientX,
						clientY: e.clientY,
						button: 2,
					})
					e.currentTarget.dispatchEvent(contextMenuEvent)
				}

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

			function onContextMenu(e: React.MouseEvent) {
				if (editor.user.getIsRightClickToDrag() && pointerMovedRef.current) {
					preventDefault(e)
				}
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
				onContextMenu,
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
			// Specifically, in local mode (non-https) mode, iOS does not `useCoalescedEvents`
			// so it appears like the ink is working locally, when really it's just that `useCoalescedEvents`
			// is disabled. The intent here is to have `useCoalescedEvents` disabled for iOS.
			const events =
				!tlenv.isIos && currentTool.useCoalescedEvents && e.getCoalescedEvents
					? e.getCoalescedEvents()
					: [e]

			for (const singleEvent of events) {
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_move',
					...getPointerInfo(editor, singleEvent),
				})
			}
		}

		ownerDocument.body.addEventListener('pointermove', onPointerMove)
		return () => {
			ownerDocument.body.removeEventListener('pointermove', onPointerMove)
		}
	}, [editor, currentTool, ownerDocument])

	return events
}
