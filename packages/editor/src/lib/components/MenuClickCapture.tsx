import { useValue } from '@tldraw/state-react'
import { PointerEvent, useCallback, useRef, useState } from 'react'
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

	return (
		showElement && (
			<div
				className="tlui-menu-click-capture"
				data-testid="menu-click-capture.content"
				{...canvasEvents}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			/>
		)
	)
}
