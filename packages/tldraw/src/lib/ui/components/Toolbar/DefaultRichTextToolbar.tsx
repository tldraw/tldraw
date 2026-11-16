import { getMarkRange, Range, EditorEvents as TextEditorEvents } from '@tiptap/core'
import { MarkType } from '@tiptap/pm/model'
import {
	Box,
	debounce,
	defineMessages,
	TiptapEditor,
	track,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { rectToBox, TldrawUiContextualToolbar } from '../primitives/TldrawUiContextualToolbar'
import { DefaultRichTextToolbarContent } from './DefaultRichTextToolbarContent'
import { LinkEditor } from './LinkEditor'

const messages = defineMessages({
	toolRichTextToolbarTitle: {
		id: 'tool.rich-text-toolbar-title',
		defaultMessage: 'Text formatting',
	},
})

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
	const { isEditingLink, onEditLinkStart, onEditLinkClose } = useEditingLinkBehavior(textEditor)
	const [currentSelection, setCurrentSelection] = useState<Range | null>(null)
	const previousSelectionBounds = useRef<Box | undefined>(undefined)
	const isMousingDown = useIsMousingDownOnTextEditor(textEditor)
	const msg = useTranslation()

	const getSelectionBounds = useCallback(() => {
		if (isEditingLink) {
			// Focus is in the link input, so there's no DOM selection to measure. Measure the link
			// from the document instead: a link opened by a click never had its range measured, and
			// falling back to previousSelectionBounds left the editor off screen while its input
			// still took the keyboard.
			const { from, to } = textEditor.state.selection
			if (from === to) return previousSelectionBounds.current
			const start = textEditor.view.coordsAtPos(from, 1)
			const end = textEditor.view.coordsAtPos(to, -1)
			const minX = Math.min(start.left, end.left)
			const minY = Math.min(start.top, end.top)
			return new Box(
				minX,
				minY,
				Math.max(start.right, end.right) - minX,
				Math.max(start.bottom, end.bottom) - minY
			)
		}
		// Get the text selection rects as a box. This will be undefined if there are no selections.
		const selection = editor.getContainerWindow().getSelection()

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
	}, [editor, textEditor, currentSelection, isEditingLink])

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
			label={msg(messages.toolRichTextToolbarTitle)}
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

export function useEditingLinkBehavior(textEditor?: TiptapEditor) {
	const [isEditingLink, setIsEditingLink] = useState(false)

	// Set up text editor event listeners.
	useEffect(() => {
		if (!textEditor) {
			setIsEditingLink(false)
			return
		}

		const handleClick = (e: MouseEvent) => {
			// Decide from the clicked element, not the selection. The link mark is inclusive, so a
			// caret just after a link (from clicking past the end of its line) reports it as active.
			// And clicking inside an existing range selection (e.g. the select-all on entering edit
			// mode) only moves ProseMirror's selection on a later selectionchange, so at this point
			// the selection can still be the old range.
			const ElementCtor = textEditor.view.dom.ownerDocument.defaultView?.Element ?? Element
			const linkEl = e.target instanceof ElementCtor ? e.target.closest('a') : null
			const range =
				linkEl && textEditor.view.dom.contains(linkEl)
					? getMarkRange(
							textEditor.state.doc.resolve(textEditor.view.posAtDOM(linkEl, 0)),
							textEditor.schema.marks.link as MarkType
						)
					: undefined
			if (!range) {
				setIsEditingLink(false)
				return
			}
			// Keep a caret or partial selection inside the link (the effect below expands a caret),
			// but replace a stale selection that reaches outside it.
			const { from, to } = textEditor.state.selection
			if (from < range.from || to > range.to) {
				textEditor.commands.setTextSelection(range)
			}
			setIsEditingLink(true)
		}

		textEditor.view.dom.addEventListener('click', handleClick)
		return () => {
			if (textEditor.isInitialized) {
				textEditor.view.dom.removeEventListener('click', handleClick)
			}
		}
	}, [textEditor, isEditingLink])

	// If we're editing a link, select the entire link.
	// This can happen via a click or via keyboarding over to the link and then
	// clicking the toolbar button.
	useEffect(() => {
		if (!textEditor) {
			return
		}

		// N.B. Both checks are needed. isEditingLink alone isn't enough: going edit-to-edit (text
		// editor to text editor in different shapes) doesn't reset it quickly enough. isActive alone
		// isn't either: closing the link editor would re-select the whole link from the caret it
		// leaves at the link's edge.
		if (isEditingLink && textEditor.isActive('link')) {
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

	const onEditLinkClose = useCallback(() => {
		setIsEditingLink(false)
		if (!textEditor) return
		const from = textEditor.state.selection.from
		textEditor.commands.setTextSelection({ from, to: from })
	}, [textEditor])

	return { isEditingLink, onEditLinkStart, onEditLinkClose }
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
		const doc = textEditor.view.dom.ownerDocument
		touchUpEvents.forEach((eventName: string) => {
			doc.body.addEventListener(eventName, handlePointingUp)
		})
		return () => {
			touchDownEvents.forEach((eventName: string) => {
				if (textEditor.isInitialized) {
					textEditor.view.dom.removeEventListener(eventName, handlePointingDown)
				}
			})
			touchUpEvents.forEach((eventName: string) => {
				doc.body.removeEventListener(eventName, handlePointingUp)
			})
		}
	}, [textEditor])

	return isMousingDown
}
