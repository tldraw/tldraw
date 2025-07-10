import { getMarkRange, Range, EditorEvents as TextEditorEvents } from '@tiptap/core'
import { MarkType } from '@tiptap/pm/model'
import { Box, debounce, TiptapEditor, track, useEditor, useValue } from '@tldraw/editor'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
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
	const { isEditingLink, onEditLinkStart, onEditLinkClose } = useEditingLinkBehavior(textEditor)
	const [currentSelection, setCurrentSelection] = useState<Range | null>(null)
	const previousSelectionBounds = useRef<Box | undefined>()
	const isMousingDown = useIsMousingDownOnTextEditor(textEditor)
	const msg = useTranslation()

	const getSelectionBounds = useCallback(() => {
		if (isEditingLink) {
			// If we're editing a link we don't have selection bounds temporarily.
			return previousSelectionBounds.current
		}
		// Get the text selection rects as a box. This will be undefined if there are no selections.
		const selection = window.getSelection()

		// If there are no selections, don't return a box
		if (!currentSelection || !selection || selection.rangeCount === 0 || selection.isCollapsed)
			return

		// Get a common box from all of the ranges' screen rects
		const rangeBoxes: Box[] = []
		for (let i = 0; i < selection.rangeCount; i++) {
			const range = selection.getRangeAt(i)
			rangeBoxes.push(rectToBox(range.getBoundingClientRect()))
		}

		const bounds = Box.Common(rangeBoxes)
		previousSelectionBounds.current = bounds
		return bounds
	}, [currentSelection, isEditingLink])

	useEffect(() => {
		const handleSelectionUpdate = ({ editor: textEditor }: TextEditorEvents['selectionUpdate']) =>
			setCurrentSelection(textEditor.state.selection)
		textEditor.on('selectionUpdate', handleSelectionUpdate)
		// Need to kick off the selection update manually to get the initial selection, esp. if select-all.
		handleSelectionUpdate({ editor: textEditor } as TextEditorEvents['selectionUpdate'])
		return () => {
			textEditor.off('selectionUpdate', handleSelectionUpdate)
		}
	}, [textEditor])

	return (
		<TldrawUiContextualToolbar
			className="tlui-rich-text__toolbar"
			getSelectionBounds={getSelectionBounds}
			isMousingDown={isMousingDown}
			changeOnlyWhenYChanges={true}
			label={msg('tool.rich-text-toolbar-title')}
		>
			{children ? (
				children
			) : isEditingLink ? (
				<LinkEditor
					textEditor={textEditor}
					value={textEditor.isActive('link') ? textEditor.getAttributes('link').href : ''}
					onClose={onEditLinkClose}
				/>
			) : (
				<DefaultRichTextToolbarContent textEditor={textEditor} onEditLinkStart={onEditLinkStart} />
			)}
		</TldrawUiContextualToolbar>
	)
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

	const onEditLinkClose = useCallback(() => {
		setIsEditingLink(false)
		if (!textEditor) return
		const from = textEditor.state.selection.from
		textEditor.commands.setTextSelection({ from, to: from })
	}, [textEditor])

	return { isEditingLink, onEditLinkStart, onEditLinkClose, onEditLinkCancel }
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
