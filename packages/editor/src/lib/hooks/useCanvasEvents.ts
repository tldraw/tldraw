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
import { useEditor } from './useEditor'

export function useCanvasEvents() {
	const editor = useEditor()
	const ownerDocument = editor.getContainerDocument()
	const currentTool = useValue('current tool', () => editor.getCurrentTool(), [editor])

	const events = useMemo(
		function canvasEvents() {
			function onPointerDown(e: React.PointerEvent) {
				if (editor.wasEventAlreadyHandled(e)) return

				// With right-click panning disabled, fire right_click on press and let the
				// native contextmenu through so the menu opens at the pointer-down location.
				if (e.button === 2 && !editor.options.rightClickPanning) {
					editor.dispatch({
						type: 'pointer',
						target: 'canvas',
						name: 'right_click',
						...getPointerInfo(editor, e),
					})
					return
				}

				if (e.button !== 0 && e.button !== 1 && e.button !== 2 && e.button !== 5) return

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

				const rightClickPanning = editor.options.rightClickPanning
				// Check before dispatch (which resets isPanning)
				const wasRightClickPanning =
					rightClickPanning && e.button === 2 && editor.inputs.getIsPanning()

				releasePointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_up',
					...getPointerInfo(editor, e),
				})

				// Static right-click: fire contextmenu at the pointer-up location
				if (rightClickPanning && e.button === 2 && !wasRightClickPanning) {
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

					await editor.putExternalContent({
						type: 'files',
						files,
						point: pagePoint,
					})
					return
				}

				const url = e.dataTransfer.getData('url')
				if (url) {
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
				// Only suppress the native browser contextmenu when it follows a real
				// right-click (button=2 with no ctrl modifier). For those, our pointer
				// handling has already decided what to do (either we'll dispatch a
				// synthetic contextmenu on pointerup to open the menu at the release
				// position, or we panned and don't want a menu at all).
				//
				// Other contextmenu sources must reach Radix so the menu opens:
				// - ctrl+click on macOS (button=0, or button=2 with ctrlKey=true)
				// - long-press on touch devices (button=0, pointerType=touch)
				if (e.button !== 2 || e.ctrlKey) return
				preventDefault(e)
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
