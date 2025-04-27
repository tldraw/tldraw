import { getMarkRange, Range } from '@tiptap/core'
import { MarkType } from '@tiptap/pm/model'
import {
	Box,
	clamp,
	debounce,
	Editor,
	TiptapEditor,
	tltime,
	track,
	useAtom,
	useEditor,
	useQuickReactor,
	useReactor,
	useValue,
	Vec,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiContextualToolbar } from '../primitives/TldrawUiContextualToolbar'
import { DefaultRichTextToolbarContent } from './DefaultRichTextToolbarContent'
import { LinkEditor } from './LinkEditor'

const MOVE_TIMEOUT = 150
const HIDE_VISIBILITY_TIMEOUT = 16
const SHOW_VISIBILITY_TIMEOUT = 16
const TOOLBAR_GAP = 8
const SCREEN_MARGIN = 16
const MIN_DISTANCE_TO_REPOSITION_SQUARED = 16 ** 2
const HIDE_TOOLBAR_WHEN_CAMERA_IS_MOVING = true
const CHANGE_ONLY_WHEN_Y_CHANGES = true
const LEFT_ALIGN_TOOLBAR = false

/** @public */
export interface TLUiRichTextToolbarProps {
	children?: React.ReactNode
}

/**
 * The default rich text toolbar.
 *
 * @public @react
 */
export const DefaultRichTextToolbar = track(function DefaultRichTextToolbar({
	children,
}: TLUiRichTextToolbarProps) {
	const editor = useEditor()

	const textEditor = useValue('textEditor', () => editor.getRichTextEditor(), [editor])

	if (editor.getInstanceState().isCoarsePointer || !textEditor) return null

	return <ContextualToolbarInner textEditor={textEditor}>{children}</ContextualToolbarInner>
})

function ContextualToolbarInner({
	textEditor,
	children,
}: {
	children?: React.ReactNode
	textEditor: TiptapEditor
}) {
	const editor = useEditor()
	const msg = useTranslation()

	const rToolbar = useRef<HTMLDivElement>(null)

	const { isVisible, isInteractive, hide, show, position, move } =
		useToolbarVisibilityStateMachine()

	const { isEditingLink, onEditLinkStart, onEditLinkComplete } = useEditingLinkBehavior(textEditor)

	// We use an atom to force the toolbar position to update
	// This gets triggered when:
	// - the selection changes
	// - the shape changes
	const forcePositionUpdateAtom = useAtom('force toolbar position update', 0)

	useEffect(
		function forceUpdateWhenSelectionUpdates() {
			function handleSelectionUpdate() {
				forcePositionUpdateAtom.update((t) => t + 1)
			}
			// Run me once after a raf to force the toolbar position to update immediately.
			// This is needed in order to capture a "select all" moment, e.g. when
			// double clicking a geo shape to edit its text. We need the raf to let the selection occur.
			tltime.requestAnimationFrame('first forced update', handleSelectionUpdate)
			textEditor.on('selectionUpdate', handleSelectionUpdate)
			return () => {
				textEditor.off('selectionUpdate', handleSelectionUpdate)
			}
		},
		[textEditor, forcePositionUpdateAtom]
	)

	useReactor(
		'shape change',
		function forceUpdateOnNextFrameWhenShapeChanges() {
			// Ok, this is crazy bullshit but here's what's happening:
			// 1. the editing shape updates
			// 2. the shape's position changes (maybe) based on its new size
			// 3. we force an update
			// 4. we update the toolbar position
			// It's IMPORTANT that this is a normal "useReactor" and not a "useQuickReactor",
			// so that the force update happens on the NEXT FRAME after the change. It takes a
			// frame between 2 and 3 for the shape to update its position. If we don't wait, then
			// we race the shape's position update and the measurement of the selection screen rects.
			// If you really want to test this, try changing this to a "useQuickReactor", select a
			// shape's text, and then use the style panel to change the shape's size.

			editor.getEditingShape() // capture the editing shape
			forcePositionUpdateAtom.update((t) => t + 1)
		},
		[editor]
	)

	// annoying react stuff: we don't want the toolbar position function to depend on the react state so we'll double with a ref
	const rCouldShowToolbar = useRef(false)
	const [hasValidToolbarPosition, setHasValidToolbarPosition] = useState(false)

	useQuickReactor(
		'toolbar position',
		function updateToolbarPositionAndDisplay() {
			const toolbarElm = rToolbar.current
			if (!toolbarElm) return

			// capture / force this to update when...
			editor.getCamera() // the camera moves
			forcePositionUpdateAtom.get() // the selection changes

			// undefined here means that we can't show the toolbar due to an incompatible position
			const position = getToolbarScreenPosition(editor, toolbarElm)

			// todo: when the toolbar is hidden due to the selection being off screen, it should be hidden immediately
			// rather than waiting for the position to settle. This is different than when the position changes due to
			// a change in the user's selection.
			if (!position) {
				if (rCouldShowToolbar.current) {
					// If we don't have a position, then we're not showing the toolbar
					rCouldShowToolbar.current = false
					setHasValidToolbarPosition(false)
				}
				return
			}

			// If the camera state is moving, we want to immediately update the position
			// todo: consider hiding the toolbar while the camera is moving
			const cameraState = editor.getCameraState()
			if (cameraState === 'moving') {
				// ...if we wanted this to avoid prematurely updating any positions, we'd need
				// to have the last updated position in page space, so that we could convert
				// it to screen space and update it here
				const elm = rToolbar.current
				elm.style.setProperty('transform', `translate(${position.x}px, ${position.y}px)`)
			} else {
				// Schedule a move to its next location
				move(position.x, position.y)
			}

			// Finally, if the toolbar was previously hidden, show it again
			if (!rCouldShowToolbar.current) {
				rCouldShowToolbar.current = true
				setHasValidToolbarPosition(true)
			}
		},
		[editor, textEditor, forcePositionUpdateAtom]
	)

	const cameraState = useValue('camera state', () => editor.getCameraState(), [editor])
	const isMousingDown = useIsMousingDownOnTextEditor(textEditor)

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
		const elm = rToolbar.current
		if (!elm) return
		elm.dataset.visible = `${isVisible}`
	}, [isVisible, position])

	// When the position changes, update the toolbar's position on screen
	useLayoutEffect(() => {
		const elm = rToolbar.current
		if (!elm) return
		elm.style.setProperty('transform', `translate(${position.x}px, ${position.y}px)`)
	}, [position])

	// When the interactivity changes, update the toolbar's interactivity
	useLayoutEffect(() => {
		const elm = rToolbar.current
		if (!elm) return
		elm.dataset.interactive = `${isInteractive}`
	}, [isInteractive])

	return (
		<TldrawUiContextualToolbar
			ref={rToolbar}
			className="tlui-rich-text__toolbar"
			data-interactive={false}
			data-visible={false}
			label={msg('tool.rich-text-toolbar-title')}
		>
			{children ? (
				children
			) : isEditingLink ? (
				<LinkEditor
					textEditor={textEditor}
					value={textEditor.isActive('link') ? textEditor.getAttributes('link').href : ''}
					onComplete={onEditLinkComplete}
				/>
			) : (
				<DefaultRichTextToolbarContent textEditor={textEditor} onEditLinkStart={onEditLinkStart} />
			)}
		</TldrawUiContextualToolbar>
	)
}

// For convenience, let's work just with boxes here
function rectToBox(rect: DOMRect): Box {
	return new Box(rect.x, rect.y, rect.width, rect.height)
}

// Extracted here
function getToolbarScreenPosition(editor: Editor, toolbarElm: HTMLElement) {
	// Get the text selection rects as a box. This will be undefined if there are no selections.
	const selection = window.getSelection()

	// If there are no selections, don't return a box
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return

	// Get a common box from all of the ranges' screen rects
	const rangeBoxes: Box[] = []
	for (let i = 0; i < selection.rangeCount; i++) {
		const range = selection.getRangeAt(i)
		rangeBoxes.push(rectToBox(range.getBoundingClientRect()))
	}

	const selectionBounds = Box.Common(rangeBoxes)

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

function useEditingLinkBehavior(textEditor?: TiptapEditor) {
	const [isEditingLink, setIsEditingLink] = useState(false)

	// Set up text editor event listeners.
	useEffect(() => {
		if (!textEditor) {
			setIsEditingLink(false)
			return
		}

		const handleClick = () => {
			const isLinkActive = textEditor.isActive('link')
			setIsEditingLink(isLinkActive)
		}

		textEditor.view.dom.addEventListener('click', handleClick)
		return () => {
			textEditor.view.dom.removeEventListener('click', handleClick)
		}
	}, [textEditor, isEditingLink])

	// If we're editing a link, select the entire link.
	// This can happen via a click or via keyboarding over to the link and then
	// clicking the toolbar button.
	useEffect(() => {
		if (!textEditor) {
			return
		}

		// N.B. This specifically isn't checking the isEditingLink state but
		// the current active state of the text editor. This is because there's
		// a subtelty where when going edit-to-edit, that is text editor-to-text editor
		// in different shapes, the isEditingLink state doesn't get reset quickly enough.
		if (textEditor.isActive('link')) {
			try {
				const { from, to } = getMarkRange(
					textEditor.state.doc.resolve(textEditor.state.selection.from),
					textEditor.schema.marks.link as MarkType
				) as Range
				// Select the entire link if we just clicked on it while in edit mode, but not if there's
				// a specific selection.
				if (textEditor.state.selection.empty) {
					textEditor.commands.setTextSelection({ from, to })
				}
			} catch {
				// Sometimes getMarkRange throws an error when the selection is the entire document.
				// This is somewhat mysterious but it's harmless. We just need to ignore it.
				// Also, this seems to have recently broken with the React 19 preparation changes.
			}
		}
	}, [textEditor, isEditingLink])

	const onEditLinkStart = useCallback(() => {
		setIsEditingLink(true)
	}, [])

	const onEditLinkCancel = useCallback(() => {
		setIsEditingLink(false)
	}, [])

	const onEditLinkComplete = useCallback(() => {
		setIsEditingLink(false)
		if (!textEditor) return
		const from = textEditor.state.selection.from
		textEditor.commands.setTextSelection({ from, to: from })
	}, [textEditor])

	return { isEditingLink, onEditLinkStart, onEditLinkComplete, onEditLinkCancel }
}

function sufficientlyDistant(curr: Vec, next: Vec) {
	if (CHANGE_ONLY_WHEN_Y_CHANGES) {
		return Vec.Sub(next, curr).y ** 2 >= MIN_DISTANCE_TO_REPOSITION_SQUARED
	}
	return Vec.Len2(Vec.Sub(next, curr)) >= MIN_DISTANCE_TO_REPOSITION_SQUARED
}

function useToolbarVisibilityStateMachine() {
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
		(x: number, y: number) => {
			// Update the next proposed position
			rNextPosition.current.x = x
			rNextPosition.current.y = y

			// If the toolbar is not yet visible, don't do anything
			if (rState.current.name === 'hidden' || rState.current.name === 'showing') return

			// If showing or hiding, cancel the position timeout and start a new one.
			// When the timeout ends, if we're in the 'shown' state and the position has changed sufficiently
			// from the last visible position, update the position.
			clearTimeout(rStablePositionTimeout.current)
			rStablePositionTimeout.current = editor.timers.setTimeout(() => {
				if (
					rState.current.name === 'shown' &&
					sufficientlyDistant(rNextPosition.current, rCurrPosition.current)
				) {
					const { x, y } = rNextPosition.current
					rCurrPosition.current = new Vec(x, y)
					setPosition({ x, y })
				}
			}, MOVE_TIMEOUT)
		},
		[editor]
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

function useIsMousingDownOnTextEditor(textEditor: TiptapEditor) {
	const [isMousingDown, setIsMousingDown] = useState(false)

	// Set up general event listeners for text selection.
	useEffect(() => {
		if (!textEditor) return

		const handlePointingStateChange = debounce(({ isPointing }: { isPointing: boolean }) => {
			setIsMousingDown(isPointing)
		}, 16)
		const handlePointingDown = () => handlePointingStateChange({ isPointing: true })
		const handlePointingUp = () => handlePointingStateChange({ isPointing: false })

		const touchDownEvents = ['touchstart', 'pointerdown', 'mousedown']
		const touchUpEvents = ['touchend', 'pointerup', 'mouseup']
		touchDownEvents.forEach((eventName: string) => {
			textEditor.view.dom.addEventListener(eventName, handlePointingDown)
		})
		touchUpEvents.forEach((eventName: string) => {
			document.body.addEventListener(eventName, handlePointingUp)
		})
		return () => {
			touchDownEvents.forEach((eventName: string) => {
				textEditor.view.dom.removeEventListener(eventName, handlePointingDown)
			})
			touchUpEvents.forEach((eventName: string) => {
				document.body.removeEventListener(eventName, handlePointingUp)
			})
		}
	}, [textEditor])

	return isMousingDown
}
