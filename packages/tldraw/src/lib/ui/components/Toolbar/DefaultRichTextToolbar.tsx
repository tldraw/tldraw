import { getMarkRange, Range } from '@tiptap/core'
import { MarkType } from '@tiptap/pm/model'
import {
	Box,
	debounce,
	TiptapEditor,
	tltime,
	track,
	useAtom,
	useEditor,
	useReactor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useState } from 'react'
import { rectToBox, TldrawUiContextualToolbar } from '../primitives/TldrawUiContextualToolbar'
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
	const { isEditingLink, onEditLinkStart, onEditLinkComplete } = useEditingLinkBehavior(textEditor)
	const isMousingDown = useIsMousingDownOnTextEditor(textEditor)

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

	return (
		<TldrawUiContextualToolbar
			className="tlui-rich-text__toolbar"
			getSelectionBounds={getSelectionBounds}
			isMousingDown={isMousingDown}
			forcePositionUpdateAtom={forcePositionUpdateAtom}
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

function getSelectionBounds() {
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

	return Box.Common(rangeBoxes)
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
