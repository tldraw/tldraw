import { getMarkRange, Range } from '@tiptap/core'
import { MarkType } from '@tiptap/pm/model'
import {
	Box,
	clamp,
	debounce,
	Editor,
	TiptapEditor,
	tlenv,
	tltime,
	track,
	useAtom,
	useEditor,
	useQuickReactor,
	useReactor,
	useValue,
	Vec,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TldrawUiContextualToolbar } from '../primitives/TldrawUiContextualToolbar'
import { DefaultRichTextToolbarContent } from './DefaultRichTextToolbarContent'
import { LinkEditor } from './LinkEditor'

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

	const isMobile = tlenv.isIos || tlenv.isAndroid

	if (isMobile || !textEditor) return null

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

	const rToolbar = useRef<HTMLDivElement>(null)

	const { isShowing, hide, show, position, move } = useToolbarVisibilityStateMachine()

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
	const [canShowToolbar, setCanShowToolbar] = useState(false)

	useQuickReactor(
		'toolbar position',
		function updateToolbarPositionAndDisplay() {
			const toolbarElm = rToolbar.current
			if (!toolbarElm) return

			// capture / force this to update when...
			editor.getCamera() // the camera moves
			forcePositionUpdateAtom.get() // the selection changes

			const position = getToolbarScreenPosition(editor, toolbarElm)

			if (!position) {
				if (rCouldShowToolbar.current) {
					// If we don't have a position, then we're not showing the toolbar
					rCouldShowToolbar.current = false
					setCanShowToolbar(false)
				}
				return
			}

			// If the camera state is moving, we want to immediately update the position
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
				setCanShowToolbar(true)
			}
		},
		[editor, textEditor, forcePositionUpdateAtom]
	)

	const isMousingDown = useIsMousingDownOnTextEditor(textEditor)

	useEffect(() => {
		if (canShowToolbar && !isMousingDown) {
			show()
		} else {
			hide()
		}
	}, [canShowToolbar, isMousingDown, show, hide])

	useEffect(() => {
		const elm = rToolbar.current
		if (!elm) return
		if (isShowing) {
			elm.style.setProperty('transform', `translate(${position.x}px, ${position.y}px)`)
			elm.classList.remove('tlui-rich-text__toolbar__hidden')
		} else {
			elm.classList.add('tlui-rich-text__toolbar__hidden')
		}
	}, [isShowing, position])

	return (
		<TldrawUiContextualToolbar
			ref={rToolbar}
			className="tlui-rich-text__toolbar tlui-rich-text__toolbar__hidden"
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
		selectionBounds.maxY < SCREEN_MARGIN ||
		selectionBounds.y > vsb.h - SCREEN_MARGIN ||
		selectionBounds.maxX < SCREEN_MARGIN ||
		selectionBounds.x > vsb.w - SCREEN_MARGIN
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
	// except in the cases where it would extend off the edge of the screen. If
	// the re-positioned toolbar is too far from the selection, we'll hide it.

	// Start by placing the top left corner of the toolbar so that the
	// toolbar would be centered above the section bounds, bumped up by the

	let x = selectionBounds.midX - toolbarBounds.w / 2
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

const TOOLBAR_GAP = 8

const SCREEN_MARGIN = 16

function useToolbarVisibilityStateMachine() {
	const editor = useEditor()

	const rState = useRef<
		| { name: 'hidden' }
		| { name: 'showing' }
		| { name: 'shown' }
		| { name: 'moving' }
		| { name: 'hiding' }
	>({ name: 'hidden' })

	const [isShowing, setIsShowing] = useState(false)
	const [position, setPosition] = useState({ x: -1000, y: -1000 })

	const rPrevPosition = useRef(new Vec(-1000, -1000))
	const rNextPosition = useRef(new Vec(-1000, -1000))

	const rShowHideTimeout = useRef<any>(-1)
	const rMoveTimeout = useRef<any>(-1)

	const hide = useCallback(() => {
		switch (rState.current.name) {
			case 'showing': {
				clearTimeout(rShowHideTimeout.current)
				rState.current = { name: 'hidden' }
				break
			}
			case 'shown': {
				rState.current = { name: 'hiding' }
				rShowHideTimeout.current = editor.timers.setTimeout(() => {
					rState.current = { name: 'hidden' }
					setIsShowing(false)
				}, 200)
				break
			}
			case 'hiding': {
				// noop
				// maybe update if the position is different?
				break
			}
			case 'hidden': {
				// noop
				break
			}
			default: {
				// noop
			}
		}
	}, [editor])

	const move = useCallback(
		(x: number, y: number) => {
			if (
				Vec.Len2(Vec.Sub(new Vec(x, y), rPrevPosition.current)) < MIN_DISTANCE_TO_REPOSITION_SQUARED
			) {
				return
			}
			rNextPosition.current.x = x
			rNextPosition.current.y = y

			switch (rState.current.name) {
				case 'shown': {
					// debounce on moving, too
					clearTimeout(rMoveTimeout.current)
					rMoveTimeout.current = editor.timers.setTimeout(() => {
						// must still be showing
						if (rState.current.name !== 'shown') return

						const { x, y } = rNextPosition.current
						rPrevPosition.current = new Vec(x, y)
						setPosition({ x, y })
					}, 200)
					break
				}
			}
		},
		[editor]
	)

	const show = useCallback(() => {
		switch (rState.current.name) {
			case 'hidden': {
				rState.current = { name: 'showing' }
				rShowHideTimeout.current = editor.timers.setTimeout(() => {
					// position
					const { x, y } = rNextPosition.current
					rPrevPosition.current = new Vec(x, y)
					setPosition({ x, y })

					rState.current = { name: 'shown' }
					setIsShowing(true)
				}, 150)
				break
			}
			case 'showing': {
				// keep the previous timeout
				// maybe update if the position is different?
				break
			}
			case 'shown': {
				break
			}
			case 'hiding': {
				// cancel the hide timeout
				clearTimeout(rShowHideTimeout.current)

				rState.current = { name: 'shown' }

				// Position
				move(rNextPosition.current.x, rNextPosition.current.y)
				break
			}
			default: {
				// noop
			}
		}
	}, [editor, move])

	return { isShowing, show, hide, move, position }
}

function useIsMousingDownOnTextEditor(textEditor: TiptapEditor) {
	const [isMousingDown, setIsMousingDown] = useState(false)

	// Set up general event listeners for text selection.
	useEffect(() => {
		if (!textEditor) return

		const handlePointingStateChange = debounce(({ isPointing }: { isPointing: boolean }) => {
			setIsMousingDown(isPointing)
		}, 16)

		// sorry
		textEditor.on<any>('pointer-state-change', handlePointingStateChange)
		return () => {
			// sorry
			textEditor.off<any>('pointer-state-change', handlePointingStateChange)
		}
	}, [textEditor])

	return isMousingDown
}

const MIN_DISTANCE_TO_REPOSITION_SQUARED = 16 ** 2
