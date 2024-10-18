import { useValue } from '@tldraw/state-react'
import { PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useCanvasEvents } from '../hooks/useCanvasEvents'
import { useEditor } from '../hooks/useEditor'
import { Vec } from '../primitives/Vec'

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

	// Keep track of the pointer state
	const rPointerState = useRef({
		isDown: false,
		isDragging: false,
		start: new Vec(),
	})

	const handlePointerDown = useCallback(
		(e: PointerEvent) => {
			if (e.button === 0) {
				setIsPointing(true)
				rPointerState.current = {
					isDown: true,
					isDragging: false,
					start: new Vec(e.clientX, e.clientY),
				}
			}
			editor.menus.clearOpenMenus()
		},
		[editor]
	)

	const handlePointerMove = useCallback(
		(e: PointerEvent) => {
			// Do nothing unless we're pointing
			if (!rPointerState.current.isDown) return

			// If we're already dragging, pass on the event as it is
			if (rPointerState.current.isDragging) {
				canvasEvents.onPointerMove?.(e)
				return
			}

			if (
				// We're pointing, but are we dragging?
				Vec.Dist2(rPointerState.current.start, new Vec(e.clientX, e.clientY)) >
				editor.options.dragDistanceSquared
			) {
				// Wehaddaeventitsadrag
				rPointerState.current = {
					...rPointerState.current,
					isDown: true,
					isDragging: true,
				}
				// call the onPointerDown with the original pointer position
				const { x, y } = rPointerState.current.start
				canvasEvents.onPointerDown?.({
					...e,
					clientX: x,
					clientY: y,
					button: 0,
				})
				// call the pointer move with the current pointer position
				canvasEvents.onPointerMove?.(e)
			}
		},
		[canvasEvents, editor]
	)

	const handlePointerUp = useCallback(
		(e: PointerEvent) => {
			// Run the pointer up
			canvasEvents.onPointerUp?.(e)
			// Then turn off pointing
			setIsPointing(false)
			// Reset the pointer state
			rPointerState.current = {
				isDown: false,
				isDragging: false,
				start: new Vec(e.clientX, e.clientY),
			}
		},
		[canvasEvents]
	)

	useEffect(() => {
		function handleKeyEvent(e: KeyboardEvent) {
			const target = e.target as Element | null
			// Menus, popovers, and the body should be allowed to receive keyboard events.
			if (target?.closest('.tlui-menu, .tlui-popover__content') || target === document.body) return

			e.preventDefault()
			e.stopPropagation()
		}

		if (isMenuOpen) {
			document.addEventListener('keydown', handleKeyEvent, { capture: true })
			document.addEventListener('keyup', handleKeyEvent, { capture: true })
		}

		return () => {
			document.removeEventListener('keydown', handleKeyEvent, { capture: true })
			document.removeEventListener('keyup', handleKeyEvent, { capture: true })
		}
	}, [isMenuOpen])

	return (
		showElement && (
			<div
				className="tlui-menu-overlay"
				{...canvasEvents}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			/>
		)
	)
}
