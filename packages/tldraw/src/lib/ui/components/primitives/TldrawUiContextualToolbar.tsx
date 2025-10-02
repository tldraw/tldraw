import {
	assert,
	Box,
	clamp,
	Editor,
	react,
	useAtom,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useValue,
	Vec,
} from '@tldraw/editor'
import classNames from 'classnames'
import React, { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { TldrawUiToolbar } from './TldrawUiToolbar'

const MOVE_TIMEOUT = 150
const HIDE_VISIBILITY_TIMEOUT = 16
const SHOW_VISIBILITY_TIMEOUT = 16
const MIN_DISTANCE_TO_REPOSITION_SQUARED = 16 ** 2
const TOOLBAR_GAP = 8
const SCREEN_MARGIN = 16
const HIDE_TOOLBAR_WHEN_CAMERA_IS_MOVING = false
const LEFT_ALIGN_TOOLBAR = false

/** @public */
export interface TLUiContextualToolbarProps {
	children?: React.ReactNode
	className?: string
	isMousingDown?: boolean
	getSelectionBounds(): Box | undefined
	changeOnlyWhenYChanges?: boolean
	label: string
}

/**
 * A generic floating toolbar that can be used for things
 * like rich text editing, image toolbars, etc.
 *
 * @public @react
 */
export const TldrawUiContextualToolbar = ({
	children,
	className,
	isMousingDown,
	getSelectionBounds,
	changeOnlyWhenYChanges = false,
	label,
}: TLUiContextualToolbarProps) => {
	const editor = useEditor()
	const toolbarRef = useRef<HTMLDivElement>(null)

	usePassThroughWheelEvents(toolbarRef as RefObject<HTMLDivElement>)
	usePassThroughMouseOverEvents(toolbarRef as RefObject<HTMLDivElement>)

	const { isVisible, isInteractive, hide, show, position, move } =
		useToolbarVisibilityStateMachine(changeOnlyWhenYChanges)

	// annoying react stuff: we don't want the toolbar position function to depend on the react state so we'll double with a ref
	const rCouldShowToolbar = useRef(false)
	const [hasValidToolbarPosition, setHasValidToolbarPosition] = useState(false)

	const contentSizeUpdateCounter = useAtom('content size update counter', 0)

	useEffect(() => {
		assert(toolbarRef.current)
		const observer = new ResizeObserver(() => {
			contentSizeUpdateCounter.update((n) => n + 1)
		})
		observer.observe(toolbarRef.current)
		return () => observer.disconnect()
	}, [contentSizeUpdateCounter])

	useEffect(() => {
		let lastContentSizeUpdateCounter = contentSizeUpdateCounter.get()
		return react('toolbar position', function updateToolbarPositionAndDisplay() {
			const toolbarElm = toolbarRef.current
			if (!toolbarElm) return

			const nextContentSizeUpdateCounter = contentSizeUpdateCounter.get()

			// capture / force this to update when...
			editor.getCamera() // the camera moves
			contentSizeUpdateCounter.get() // the toolbar size changes
			// undefined here means that we can't show the toolbar due to an incompatible position
			const position = getToolbarScreenPosition(editor, toolbarElm, getSelectionBounds)

			// todo: when the toolbar is hidden due to the selection being off screen, it should be hidden immediately
			// rather than waiting for the position to settle. This is different than when the position changes due to
			// a change in the user's selection.
			if (!position) {
				if (rCouldShowToolbar.current) {
					// If we don't have a position, then we're not showing the toolbar
					rCouldShowToolbar.current = false
					setHasValidToolbarPosition(false)
				}
			} else {
				// If the camera state is moving, we want to immediately update the position
				// todo: consider hiding the toolbar while the camera is moving
				const cameraState = editor.getCameraState()
				if (cameraState === 'moving') {
					// ...if we wanted this to avoid prematurely updating any positions, we'd need
					// to have the last updated position in page space, so that we could convert
					// it to screen space and update it here
					const elm = toolbarRef.current
					elm.style.setProperty('transform', `translate(${position.x}px, ${position.y}px)`)
				} else {
					const moveImmediately = lastContentSizeUpdateCounter !== nextContentSizeUpdateCounter
					// Schedule a move to its next location
					move(position.x, position.y, moveImmediately)
				}

				// Finally, if the toolbar was previously hidden, show it again
				if (!rCouldShowToolbar.current) {
					rCouldShowToolbar.current = true
					setHasValidToolbarPosition(true)
				}
			}

			lastContentSizeUpdateCounter = nextContentSizeUpdateCounter
		})
	}, [editor, getSelectionBounds, contentSizeUpdateCounter, move])

	const cameraState = useValue('camera state', () => editor.getCameraState(), [editor])

	// Send the hide or show events based on whether the user is clicking
	// and whether the toolbar's position is valid
	useEffect(() => {
		if (cameraState === 'moving' && HIDE_TOOLBAR_WHEN_CAMERA_IS_MOVING) {
			hide(true)
			return
		}

		if (isMousingDown || !hasValidToolbarPosition) {
			hide()
			return
		}

		show()
	}, [hasValidToolbarPosition, cameraState, isMousingDown, show, hide])

	// When the visibility changes, update the toolbar's visibility
	useLayoutEffect(() => {
		const elm = toolbarRef.current
		if (!elm) return
		elm.dataset.visible = `${isVisible}`
	}, [isVisible, position])

	// When the position changes, update the toolbar's position on screen
	useLayoutEffect(() => {
		const elm = toolbarRef.current
		if (!elm) return
		elm.style.setProperty('transform', `translate(${position.x}px, ${position.y}px)`)
	}, [position])

	// When the interactivity changes, update the toolbar's interactivity
	useLayoutEffect(() => {
		const elm = toolbarRef.current
		if (!elm) return
		elm.dataset.interactive = `${isInteractive}`
	}, [isInteractive])

	return (
		<div
			ref={toolbarRef}
			data-interactive={false}
			data-visible={false}
			data-testid="contextual-toolbar"
			className={classNames('tlui-contextual-toolbar', className)}
			onPointerDown={editor.markEventAsHandled}
		>
			<TldrawUiToolbar
				orientation="horizontal"
				className="tlui-menu"
				label={label}
				tooltipSide="top"
			>
				{children}
			</TldrawUiToolbar>
		</div>
	)
}

// For convenience, let's work just with boxes here
/** @internal */
export function rectToBox(rect: DOMRect): Box {
	return new Box(rect.x, rect.y, rect.width, rect.height)
}

export function getToolbarScreenPosition(
	editor: Editor,
	toolbarElm: HTMLElement,
	getSelectionBounds: () => Box | undefined
) {
	const selectionBounds = getSelectionBounds()?.clone()
	if (!selectionBounds) return

	// Offset the selection bounds by the viewport screen bounds (if the editor is scrolled or inset, etc)
	const vsb = editor.getViewportScreenBounds()
	selectionBounds.x -= vsb.x
	selectionBounds.y -= vsb.y

	// If the selection bounds are too far off of the screen, don't show the toolbar
	if (
		selectionBounds.midY < SCREEN_MARGIN ||
		selectionBounds.midY > vsb.h - SCREEN_MARGIN ||
		selectionBounds.midX < SCREEN_MARGIN ||
		selectionBounds.midX > vsb.w - SCREEN_MARGIN
	) {
		return
	}

	// Get the toolbar's screen rect as a box. Do this after we verify that there is at least one selection.
	const toolbarBounds = rectToBox(toolbarElm.getBoundingClientRect())

	// Chance these are NaN? Rare case.
	if (!toolbarBounds.width || !toolbarBounds.height) return

	// Thrashy, only do this if we're showing the toolbar
	// ! this might not be needed, the container never scrolls
	const { scrollLeft, scrollTop } = editor.getContainer()

	// We want to position the toolbar so that it is centered over the selection
	// except in the cases where it would extend off the edge of the screen.

	// Start by placing the top left corner of the toolbar so that the
	// toolbar would be centered above the section bounds, bumped up by the

	let x = LEFT_ALIGN_TOOLBAR ? selectionBounds.x : selectionBounds.midX - toolbarBounds.w / 2
	let y = selectionBounds.y - toolbarBounds.h - TOOLBAR_GAP

	// Clamp the position on screen.
	x = clamp(x, SCREEN_MARGIN, vsb.w - toolbarBounds.w - SCREEN_MARGIN)
	y = clamp(y, SCREEN_MARGIN, vsb.h - toolbarBounds.h - SCREEN_MARGIN)

	// Offset the position by the container's scroll position
	x += scrollLeft
	y += scrollTop

	// Round the position to the nearest pixel
	x = Math.round(x)
	y = Math.round(y)

	return { x, y }
}

function sufficientlyDistant(curr: Vec, next: Vec, changeOnlyWhenYChanges: boolean) {
	if (changeOnlyWhenYChanges) {
		return Vec.Sub(next, curr).y ** 2 >= MIN_DISTANCE_TO_REPOSITION_SQUARED
	}
	return Vec.Len2(Vec.Sub(next, curr)) >= MIN_DISTANCE_TO_REPOSITION_SQUARED
}

export function useToolbarVisibilityStateMachine(changeOnlyWhenYChanges: boolean) {
	const editor = useEditor()

	const rState = useRef<
		{ name: 'hidden' } | { name: 'showing' } | { name: 'shown' } | { name: 'hiding' }
	>({ name: 'hidden' })

	// The toolbar should only be interactive when in the 'shown' state
	const [isInteractive, setIsInteractive] = useState(false)

	// The toolbar is visible in the 'shown' and 'hiding' states
	const [isVisible, setIsVisible] = useState(false)

	// The position is updated when entering the 'shown' state or when moving while in the 'shown' state
	const [position, setPosition] = useState({ x: -1000, y: -1000 })

	// The toolbar's current position
	const rCurrPosition = useRef(new Vec(-1000, -1000))

	// The toolbar's proposed next position
	const rNextPosition = useRef(new Vec(-1000, -1000))

	// A timeout needs to be completed before the toolbar is shown or hidden
	const rStableVisibilityTimeout = useRef<any>(-1)

	// A timeout needs to be completed before the toolbar's position changes moved
	const rStablePositionTimeout = useRef<any>(-1)

	/**
	 * Send the 'move' event whenever something happens that would cause the toolbar's position to change.
	 * Any update here will cause
	 * If the state is 'shown', it will start a new timeout that will update the toolbar's position after it completes.
	 */
	const move = useCallback(
		(x: number, y: number, immediate = false) => {
			// Update the next proposed position
			rNextPosition.current.x = x
			rNextPosition.current.y = y

			// If the toolbar is not yet visible, don't do anything
			if (rState.current.name === 'hidden' || rState.current.name === 'showing') return

			// If showing or hiding, cancel the position timeout and start a new one.
			// When the timeout ends, if we're in the 'shown' state and the position has changed sufficiently
			// from the last visible position, update the position.
			clearTimeout(rStablePositionTimeout.current)

			const flushMove = () => {
				if (
					rState.current.name === 'shown' &&
					sufficientlyDistant(rNextPosition.current, rCurrPosition.current, changeOnlyWhenYChanges)
				) {
					const { x, y } = rNextPosition.current
					rCurrPosition.current = new Vec(x, y)
					if (immediate) {
						flushSync(() => setPosition({ x, y }))
					} else {
						setPosition({ x, y })
					}
				}
			}

			if (immediate) {
				flushMove()
			} else {
				rStablePositionTimeout.current = editor.timers.setTimeout(flushMove, MOVE_TIMEOUT)
			}
		},
		[editor, changeOnlyWhenYChanges]
	)

	/**
	 * Send the hide event whenever a change occurs that would cause the toolbar to become invisible.
	 * If the state is 'shown', it will enter 'hiding' and then 'hidden' after a timeout completes.
	 * If the state is 'showing', it will cancel the visibility timeout and enter 'hidden' immediately.
	 */
	const hide = useCallback(
		(immediate = false) => {
			switch (rState.current.name) {
				case 'showing': {
					clearTimeout(rStableVisibilityTimeout.current)
					rState.current = { name: 'hidden' }
					break
				}
				case 'shown': {
					rState.current = { name: 'hiding' }
					setIsInteractive(false) // when leaving shown, turn back on interactions

					if (immediate) {
						rState.current = { name: 'hidden' }
						setIsVisible(false)
					} else {
						rStableVisibilityTimeout.current = editor.timers.setTimeout(() => {
							rState.current = { name: 'hidden' }
							setIsVisible(false)
						}, HIDE_VISIBILITY_TIMEOUT)
					}
					break
				}
				default: {
					// noop
				}
			}
		},
		[editor]
	)

	/**
	 * Send the show event whenever a change occurs that would cause the toolbar to become visible.
	 * If the state is 'hidden', it will enter 'showing' and then 'shown' after a timeout completes.
	 * If the state is 'hiding', it will cancel the visibility timeout and enter 'shown' immediately.
	 */
	const show = useCallback(() => {
		switch (rState.current.name) {
			case 'hidden': {
				rState.current = { name: 'showing' }
				rStableVisibilityTimeout.current = editor.timers.setTimeout(() => {
					// position
					const { x, y } = rNextPosition.current
					rCurrPosition.current = new Vec(x, y)
					setPosition({ x, y })

					rState.current = { name: 'shown' }
					setIsVisible(true)
					setIsInteractive(true)
				}, SHOW_VISIBILITY_TIMEOUT)
				break
			}
			case 'hiding': {
				// Go back to shown immediately
				clearTimeout(rStableVisibilityTimeout.current)
				rState.current = { name: 'shown' }
				setIsInteractive(true) // when entering shown, turn back on interactions
				move(rNextPosition.current.x, rNextPosition.current.y)
				break
			}
			default: {
				// noop
			}
		}
	}, [editor, move])

	return { isVisible, isInteractive, show, hide, move, position }
}
