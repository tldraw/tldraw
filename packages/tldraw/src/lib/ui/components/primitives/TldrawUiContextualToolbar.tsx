import {
	assert,
	Box,
	clamp,
	Editor,
	react,
	useAtom,
	useEditor,
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
export function TldrawUiContextualToolbar({
	children,
	className,
	isMousingDown,
	getSelectionBounds,
	changeOnlyWhenYChanges = false,
	label,
}: TLUiContextualToolbarProps) {
	const editor = useEditor()
	const toolbarRef = useRef<HTMLDivElement>(null)

	usePassThroughWheelEvents(toolbarRef as RefObject<HTMLDivElement | null>)

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

			// read these so the reaction re-runs when the camera or the toolbar size changes
			editor.getCamera()
			const nextContentSizeUpdateCounter = contentSizeUpdateCounter.get()

			// undefined here means that we can't show the toolbar due to an incompatible position
			const position = getToolbarScreenPosition(editor, toolbarElm, getSelectionBounds)

			// todo: when the toolbar is hidden due to the selection being off screen, it should be hidden immediately
			// rather than waiting for the position to settle. This is different than when the position changes due to
			// a change in the user's selection.
			if (!position) {
				if (rCouldShowToolbar.current) {
					rCouldShowToolbar.current = false
					setHasValidToolbarPosition(false)
				}
			} else {
				// While the camera is moving, update the position immediately rather than through the state machine.
				// todo: consider hiding the toolbar while the camera is moving
				if (editor.getCameraState() === 'moving') {
					toolbarElm.style.setProperty('transform', `translate(${position.x}px, ${position.y}px)`)
				} else {
					const moveImmediately = lastContentSizeUpdateCounter !== nextContentSizeUpdateCounter
					move(position.x, position.y, moveImmediately)
				}

				if (!rCouldShowToolbar.current) {
					rCouldShowToolbar.current = true
					setHasValidToolbarPosition(true)
				}
			}

			lastContentSizeUpdateCounter = nextContentSizeUpdateCounter
		})
	}, [editor, getSelectionBounds, contentSizeUpdateCounter, move])

	const cameraState = useValue('camera state', () => editor.getCameraState(), [editor])

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

	useLayoutEffect(() => {
		const elm = toolbarRef.current
		if (!elm) return
		elm.dataset.visible = `${isVisible}`
	}, [isVisible, position])

	useLayoutEffect(() => {
		const elm = toolbarRef.current
		if (!elm) return
		elm.style.setProperty('transform', `translate(${position.x}px, ${position.y}px)`)
	}, [position])

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

	// Do this after we verify that there is at least one selection: layout reads are thrashy.
	const toolbarBounds = rectToBox(toolbarElm.getBoundingClientRect())

	// Chance these are NaN? Rare case.
	if (!toolbarBounds.width || !toolbarBounds.height) return

	// ! this might not be needed, the container never scrolls
	const { scrollLeft, scrollTop } = editor.getContainer()

	// Center the toolbar above the selection, clamped so it stays on screen.
	let x = LEFT_ALIGN_TOOLBAR ? selectionBounds.x : selectionBounds.midX - toolbarBounds.w / 2
	let y = selectionBounds.y - toolbarBounds.h - TOOLBAR_GAP

	x = clamp(x, SCREEN_MARGIN, vsb.w - toolbarBounds.w - SCREEN_MARGIN)
	y = clamp(y, SCREEN_MARGIN, vsb.h - toolbarBounds.h - SCREEN_MARGIN)

	return { x: Math.round(x + scrollLeft), y: Math.round(y + scrollTop) }
}

function sufficientlyDistant(curr: Vec, next: Vec, changeOnlyWhenYChanges: boolean) {
	const dist2 = changeOnlyWhenYChanges ? (next.y - curr.y) ** 2 : Vec.Dist2(next, curr)
	return dist2 >= MIN_DISTANCE_TO_REPOSITION_SQUARED
}

export function useToolbarVisibilityStateMachine(changeOnlyWhenYChanges: boolean) {
	const editor = useEditor()

	const rState = useRef<
		{ name: 'hidden' } | { name: 'showing' } | { name: 'shown' } | { name: 'hiding' }
	>({ name: 'hidden' })

	// interactive only in 'shown'; visible in 'shown' and 'hiding'
	const [isInteractive, setIsInteractive] = useState(false)
	const [isVisible, setIsVisible] = useState(false)
	const [position, setPosition] = useState({ x: -1000, y: -1000 })

	const rCurrPosition = useRef(new Vec(-1000, -1000))
	const rNextPosition = useRef(new Vec(-1000, -1000))
	const rStableVisibilityTimeout = useRef<any>(-1)
	const rStablePositionTimeout = useRef<any>(-1)

	/**
	 * Send the 'move' event whenever something happens that would cause the toolbar's position to change.
	 * If the state is 'shown', it will start a new timeout that will update the toolbar's position after it completes.
	 */
	const move = useCallback(
		(x: number, y: number, immediate = false) => {
			rNextPosition.current.x = x
			rNextPosition.current.y = y

			if (rState.current.name === 'hidden' || rState.current.name === 'showing') return

			// When the timeout ends, only reposition if still 'shown' and the position has moved
			// sufficiently far from the last visible position.
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
					setIsInteractive(false)

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
				clearTimeout(rStableVisibilityTimeout.current)
				rState.current = { name: 'shown' }
				setIsInteractive(true)
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
