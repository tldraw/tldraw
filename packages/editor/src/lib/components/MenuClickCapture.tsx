import { useValue } from '@tldraw/state-react'
import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useCanvasEvents } from '../hooks/useCanvasEvents'
import { useEditor } from '../hooks/useEditor'
import { Vec } from '../primitives/Vec'
import { releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/getPointerInfo'

/**
 * When a menu is open, this component prevents the user from interacting with the canvas.
 *
 * @public @react
 */
export function MenuClickCapture() {
	const editor = useEditor()

	const isMenuOpen = useValue('is menu open', () => editor.menus.hasAnyOpenMenus(), [editor])

	// Keep this component mounted while the pointer is down so pointerup/move still
	// land here after a synchronous clearOpenMenus() flips isMenuOpen to false.
	const [isPointing, setIsPointing] = useState(false)
	const showElement = isMenuOpen || isPointing

	const canvasEvents = useCanvasEvents()

	const rPointerState = useRef({
		isDown: false,
		isDragging: false,
		button: 0,
		start: new Vec(),
	})

	// Swallow the native contextmenu that follows a right-click pointerdown. Without
	// this, Radix's trigger catches the native event and opens a menu at the pointer-
	// DOWN position — then our own synthetic contextmenu (fired on pointerup) opens it
	// again at the release position, producing a visible flash.
	const rCancelContextMenuSwallow = useRef<null | (() => void)>(null)
	useEffect(
		() => () => {
			rCancelContextMenuSwallow.current?.()
			rCancelContextMenuSwallow.current = null
		},
		[]
	)
	const swallowNextNativeContextMenu = useCallback(() => {
		rCancelContextMenuSwallow.current?.()
		const doc = editor.getContainerDocument()
		const onContextMenu = (event: MouseEvent) => {
			// Skip our own synthetic contextmenu — only swallow the real browser one
			if (!event.isTrusted) return
			rCancelContextMenuSwallow.current?.()
			rCancelContextMenuSwallow.current = null
			event.preventDefault()
			event.stopImmediatePropagation()
		}
		const cancel = () => doc.removeEventListener('contextmenu', onContextMenu, true)
		rCancelContextMenuSwallow.current = cancel
		doc.addEventListener('contextmenu', onContextMenu, true)
		// Drop the listener on the next tick if it never fires (e.g. pointer moved off-screen)
		doc.defaultView?.setTimeout(() => {
			if (rCancelContextMenuSwallow.current === cancel) {
				cancel()
				rCancelContextMenuSwallow.current = null
			}
		}, 0)
	}, [editor])

	const handlePointerDown = useCallback(
		(e: PointerEvent) => {
			if (e.button !== 0 && e.button !== 2) return

			flushSync(() => setIsPointing(true))
			setPointerCapture(e.currentTarget, e)
			rPointerState.current = {
				isDown: true,
				isDragging: false,
				button: e.button,
				start: new Vec(e.clientX, e.clientY),
			}

			if (e.button === 2) {
				if (!editor.options.rightClickPanning) {
					// Right-click panning off: close the open menu and swallow the native
					// contextmenu that would otherwise briefly open a new one (causing a flash).
					swallowNextNativeContextMenu()
					editor.menus.clearOpenMenus()
					return
				}
				// Forward right-click pointerdown through the canvas's own handler so
				// pointer capture is also set on the canvas (load-bearing: without this
				// the context menu briefly flashes closed during consecutive right-clicks).
				// We don't clearOpenMenus() — Radix's DismissableLayer closes the menu
				// via outside-click detection, keeping its internal state in sync.
				const canvas =
					editor.getContainer().querySelector<HTMLDivElement>('.tl-canvas') ?? e.currentTarget
				canvasEvents.onPointerDown?.({ ...e, currentTarget: canvas })
				swallowNextNativeContextMenu()
				return
			}

			editor.menus.clearOpenMenus()
		},
		[canvasEvents, editor, swallowNextNativeContextMenu]
	)

	const handlePointerMove = useCallback(
		(e: PointerEvent) => {
			const state = rPointerState.current
			if (!state.isDown) return

			// Left-click: wait for the drag threshold before forwarding anything, then
			// replay pointerdown at the original start so the editor records the
			// correct drag origin. Right-click forwards moves immediately (pointerdown
			// was already dispatched in handlePointerDown).
			if (state.button !== 2 && !state.isDragging) {
				if (
					Vec.Dist2(state.start, new Vec(e.clientX, e.clientY)) <=
					editor.options.dragDistanceSquared
				) {
					return
				}
				state.isDragging = true
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_down',
					...getPointerInfo(editor, { ...e, clientX: state.start.x, clientY: state.start.y }),
				})
			}

			editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				...getPointerInfo(editor, e),
			})
		},
		[editor]
	)

	const handlePointerUp = useCallback(
		(e: PointerEvent) => {
			const isStaticRightClick = e.button === 2 && !rPointerState.current.isDragging

			editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_up',
				...getPointerInfo(editor, e),
			})

			if (isStaticRightClick && editor.options.rightClickPanning) {
				// Dispatch contextmenu on the canvas's parent (Radix's trigger) so the
				// menu opens at the release position. Bypassing the canvas avoids its
				// own onContextMenu handler, which preventDefaults non-synthesized events.
				const canvas = editor.getContainer().querySelector<HTMLDivElement>('.tl-canvas')
				const trigger = canvas?.parentElement ?? e.currentTarget
				editor.timers.requestAnimationFrame(() => {
					trigger.dispatchEvent(
						new PointerEvent('contextmenu', {
							bubbles: true,
							clientX: e.clientX,
							clientY: e.clientY,
							button: 2,
							buttons: 0,
							pointerId: e.pointerId,
							pointerType: e.pointerType,
							isPrimary: e.isPrimary,
						})
					)
				})
			}

			releasePointerCapture(e.currentTarget, e)
			setIsPointing(false)
			rPointerState.current = {
				isDown: false,
				isDragging: false,
				button: 0,
				start: new Vec(e.clientX, e.clientY),
			}
		},
		[editor]
	)

	return (
		showElement && (
			<div
				className="tlui-menu-click-capture"
				data-testid="menu-click-capture.content"
				{...canvasEvents}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onContextMenu={(e) => {
					e.preventDefault()
					e.stopPropagation()
				}}
			/>
		)
	)
}
