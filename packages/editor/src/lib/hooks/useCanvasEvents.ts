import { useValue } from '@tldraw/state-react'
import React, { useEffect, useMemo } from 'react'
import { tlenv } from '../globals/environment'
import {
	elementShouldCaptureKeys,
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
} from '../utils/dom'
import { getPointerInfo } from '../utils/getPointerInfo'
import { getPointerEventButton, isDirectDisplayPen, isSecondaryClickEvent } from '../utils/pointer'
import { useEditor } from './useEditor'

export function useCanvasEvents() {
	const editor = useEditor()
	const ownerDocument = editor.getContainerDocument()
	const currentTool = useValue('current tool', () => editor.getCurrentTool(), [editor])

	const events = useMemo(
		function canvasEvents() {
			let isSecondaryClickPointerDown = false
			// The button each accepted press started with, by pointer id. pointercancel
			// reports button -1, so the synthetic pointer_up needs the original.
			const pointerDownButtons = new Map<number, number>()

			function onPointerDown(e: React.PointerEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				const button = getPointerEventButton(e)
				isSecondaryClickPointerDown = button === 2

				// With right-click panning disabled, fire right_click on press and let the
				// native contextmenu through so the menu opens at the pointer-down location.
				if (button === 2 && !editor.options.rightClickPanning) {
					editor.dispatch({
						type: 'pointer',
						target: 'canvas',
						name: 'right_click',
						...getPointerInfo(editor, e),
					})
					return
				}

				if (button !== 0 && button !== 1 && button !== 2 && button !== 5) return

				// Detect direct-display pen input (Apple Pencil, Surface Pen on a touchscreen) so we
				// only auto-enable pen mode for it, not for an indirect desktop tablet stylus.
				const isPenDirect = isDirectDisplayPen(e)

				setPointerCapture(e.currentTarget, e)

				// Only remember presses the editor will act on. A rejected palm in pen mode
				// must not overwrite the button of the pen press it lands on top of, or the
				// pen's pointercancel would release the wrong button and skip the
				// stylus-eraser tool restore.
				const isPenMode = editor.getInstanceState().isPenMode
				if (!editor.inputs.getIsPinching() && !(isPenMode && e.pointerType !== 'pen')) {
					pointerDownButtons.set(e.pointerId, button)
				}

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_down',
					...getPointerInfo(editor, e),
					isPenDirect,
				})
			}

			function onPointerUp(e: React.PointerEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				pointerDownButtons.delete(e.pointerId)
				const button = isSecondaryClickPointerDown ? 2 : getPointerEventButton(e)
				if (button !== 0 && button !== 1 && button !== 2 && button !== 5) return

				const rightClickPanning = editor.options.rightClickPanning
				// Check before dispatch (which resets isPanning)
				const wasRightClickPanning =
					rightClickPanning && button === 2 && editor.inputs.getIsPanning()

				releasePointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_up',
					...getPointerInfo(editor, e),
					button,
				})

				// Static right-click: fire contextmenu at the pointer-up location
				if (rightClickPanning && button === 2 && !wasRightClickPanning) {
					const contextMenuEvent = new PointerEvent('contextmenu', {
						bubbles: true,
						clientX: e.clientX,
						clientY: e.clientY,
						button: 2,
						buttons: 0,
						pointerId: e.pointerId,
						pointerType: e.pointerType,
						isPrimary: e.isPrimary,
					})
					e.currentTarget.dispatchEvent(contextMenuEvent)
				}
				isSecondaryClickPointerDown = false
			}

			function onPointerCancel(e: React.PointerEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				const pointerDownButton = pointerDownButtons.get(e.pointerId)
				pointerDownButtons.delete(e.pointerId)
				// In pen mode a cancelled touch is usually a rejected palm, and the pen's own
				// interaction must survive it.
				if (editor.getInstanceState().isPenMode && e.pointerType !== 'pen') return

				releasePointerCapture(e.currentTarget, e)

				// Nothing to end if the press itself was filtered out (pen mode, unsupported
				// button), or if this pointer never started an accepted press.
				if (!editor.inputs.getIsPointing() || pointerDownButton === undefined) return

				// The browser has taken the pointer (edge swipe, incoming call) and will never send
				// pointerup, so end the gesture here or the tool stays stuck in its pointing or
				// dragging state and the next touch continues it.
				editor.interrupt()
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_up',
					...getPointerInfo(editor, e),
					button: pointerDownButton,
				})
				isSecondaryClickPointerDown = false
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
				if (!(e.target instanceof editor.getContainerWindow().HTMLElement)) return

				const editingShapeId = editor.getEditingShapeId()
				if (
					// if the target is not inside the editing shape
					!(editingShapeId && e.target.closest(`[data-shape-id="${editingShapeId}"]`)) &&
					// and the target is not an clickable element
					e.target.tagName !== 'A' &&
					// and the target is not an editable element
					!elementShouldCaptureKeys(e.target, false)
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

				const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })

				// Call the custom onDropOnCanvas callback if provided
				if (editor.options.experimental__onDropOnCanvas) {
					const handled = editor.options.experimental__onDropOnCanvas({
						point: pagePoint,
						event: e,
					})
					if (handled) return
				}

				if (e.dataTransfer?.files?.length) {
					const files = Array.from(e.dataTransfer.files)

					editor.markHistoryStoppingPoint('drop')
					await editor.putExternalContent({
						type: 'files',
						files,
						point: pagePoint,
					})
					return
				}

				const url = e.dataTransfer.getData('url')
				if (url) {
					editor.markHistoryStoppingPoint('drop')
					await editor.putExternalContent({
						type: 'url',
						url,
						point: pagePoint,
					})
					return
				}
			}

			function onClick(e: React.MouseEvent) {
				if (editor.wasEventAlreadyHandled(e)) return
				e.stopPropagation()
			}

			function onContextMenu(e: React.MouseEvent) {
				// With right-click panning disabled, let the native contextmenu through so the
				// menu opens on press.
				if (!editor.options.rightClickPanning) return
				// Synthetic events — our own dispatch from onPointerUp, or tests using
				// fireEvent.contextMenu — pass through so Radix can open the menu.
				if (!e.nativeEvent.isTrusted) return
				// Only suppress the native browser contextmenu when it follows a
				// secondary click. For those, our pointer handling has already
				// decided what to do (either we'll dispatch a synthetic contextmenu on
				// pointerup to open the menu at the release position, or we panned and
				// don't want a menu at all).
				//
				// Other contextmenu sources must reach Radix so the menu opens:
				// - long-press on touch devices (button=0, pointerType=touch)
				if (!isSecondaryClickEvent(e)) return
				preventDefault(e)
			}

			return {
				onPointerDown,
				onPointerUp,
				onPointerCancel,
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
