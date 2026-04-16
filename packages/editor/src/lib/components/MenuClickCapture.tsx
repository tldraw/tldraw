import { useValue } from '@tldraw/state-react'
import { PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
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

	// Whether any menus are open
	const isMenuOpen = useValue('is menu open', () => editor.menus.hasAnyOpenMenus(), [editor])

	// Whether we're pointing or not—keep this component visible if we're pointing
	const [isPointing, setIsPointing] = useState(false)

	const showElement = isMenuOpen || isPointing

	// Get the same events that we use on the canvas
	const canvasEvents = useCanvasEvents()

	const rSuppressNativeContextMenuCleanup = useRef<null | (() => void)>(null)

	useEffect(() => {
		return () => {
			rSuppressNativeContextMenuCleanup.current?.()
			rSuppressNativeContextMenuCleanup.current = null
		}
	}, [])

	// Keep track of the pointer state
	const rPointerState = useRef({
		isDown: false,
		isDragging: false,
		button: 0,
		start: new Vec(),
	})

	const handlePointerDown = useCallback(
		(e: PointerEvent) => {
			if (e.button === 0 || e.button === 2) {
				flushSync(() => {
					setIsPointing(true)
				})
				setPointerCapture(e.currentTarget, e)
				rPointerState.current = {
					isDown: true,
					isDragging: false,
					button: e.button,
					start: new Vec(e.clientX, e.clientY),
				}
				rDidAPointerDownAndDragWhileMenuWasOpen.current = false
				if (e.button === 2) {
					const canvas =
						editor.getContainer().querySelector<HTMLDivElement>('.tl-canvas') ?? e.currentTarget
					canvasEvents.onPointerDown?.({
						...e,
						currentTarget: canvas,
					})
					rDidAPointerDownAndDragWhileMenuWasOpen.current = true
				}
			}
			if (e.button === 2) {
				const ownerDocument = editor.getContainerDocument()
				rSuppressNativeContextMenuCleanup.current?.()
				// Swallow the contextmenu event that follows this right-click pointerdown.
				// clearOpenMenus() below triggers a synchronous render that unmounts this
				// component, so our React onContextMenu handler won't be around to catch it.
				// Without this, the contextmenu event reaches the Radix Trigger and briefly
				// opens a new context menu (which then immediately dismisses — causing a flash).
				const handleContextMenu = (event: MouseEvent) => {
					if (!event.isTrusted) return
					rSuppressNativeContextMenuCleanup.current?.()
					rSuppressNativeContextMenuCleanup.current = null
					event.preventDefault()
					event.stopImmediatePropagation()
				}
				const cleanup = () => {
					ownerDocument.removeEventListener('contextmenu', handleContextMenu, true)
				}
				rSuppressNativeContextMenuCleanup.current = cleanup
				ownerDocument.addEventListener('contextmenu', handleContextMenu, true)
				ownerDocument.defaultView?.setTimeout(() => {
					if (rSuppressNativeContextMenuCleanup.current === cleanup) {
						cleanup()
						rSuppressNativeContextMenuCleanup.current = null
					}
				}, 0)
			}
			editor.menus.clearOpenMenus()
		},
		[canvasEvents, editor]
	)

	const rDidAPointerDownAndDragWhileMenuWasOpen = useRef(false)

	const handlePointerMove = useCallback(
		(e: PointerEvent) => {
			// Do nothing unless we're pointing
			if (!rPointerState.current.isDown) return

			// call the onPointerDown with the original pointer position
			const { x, y } = rPointerState.current.start

			if (!rDidAPointerDownAndDragWhileMenuWasOpen.current) {
				if (
					// We're pointing, but are we dragging?
					Vec.Dist2(rPointerState.current.start, new Vec(e.clientX, e.clientY)) >
					editor.options.dragDistanceSquared
				) {
					rDidAPointerDownAndDragWhileMenuWasOpen.current = true
					// Wehaddaeventitsadrag
					rPointerState.current = {
						...rPointerState.current,
						isDown: true,
						isDragging: true,
					}
					canvasEvents.onPointerDown?.({
						...e,
						clientX: x,
						clientY: y,
						button: rPointerState.current.button,
					})
				}
			}

			if (rDidAPointerDownAndDragWhileMenuWasOpen.current) {
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_move',
					...getPointerInfo(editor, e),
				})
			}
		},
		[canvasEvents, editor]
	)

	const handlePointerUp = useCallback(
		(e: PointerEvent) => {
			const isStaticRightClick = e.button === 2 && !rPointerState.current.isDragging
			const canvas =
				e.button === 2
					? (editor.getContainer().querySelector<HTMLDivElement>('.tl-canvas') ?? e.currentTarget)
					: e.currentTarget
			// Run the pointer up
			canvasEvents.onPointerUp?.({ ...e, currentTarget: canvas })
			if (isStaticRightClick) {
				const trigger = (editor.getContainer().querySelector<HTMLDivElement>('.tl-canvas')
					?.parentElement ?? canvas) as Element
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
			// Then turn off pointing
			setIsPointing(false)
			// Reset the pointer state
			rPointerState.current = {
				isDown: false,
				isDragging: false,
				button: 0,
				start: new Vec(e.clientX, e.clientY),
			}
			rDidAPointerDownAndDragWhileMenuWasOpen.current = false
		},
		[canvasEvents, editor]
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
