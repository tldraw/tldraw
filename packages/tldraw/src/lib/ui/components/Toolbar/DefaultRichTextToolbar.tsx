import { Editor as TextEditor, EditorEvents as TextEditorEvents } from '@tiptap/core'
import { EditorState as TextEditorState } from '@tiptap/pm/state'
import { Box, Editor, areObjectsShallowEqual, track, useEditor, useValue } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'
import { useContextualToolbarPosition } from '../../hooks/useContextualToolbarPosition'
import { TldrawUiContextualToolbar } from '../primitives/TldrawUiContextualToolbar'
import { DefaultRichTextToolbarItems } from './DefaultRichTextToolbarItems'
import { LinkEditor } from './LinkEditor'

/**
 * The default rich text toolbar.
 *
 * @public @react
 */
export const DefaultRichTextToolbar = track(function DefaultRichTextToolbar({
	children,
}: {
	children?: React.ReactNode
}) {
	const editor = useEditor()
	const toolbarRef = useRef<HTMLDivElement>(null)
	const previousTop = useRef(defaultPosition.y)
	const [currentSelectionToPageBox, setCurrentSelectionToPageBox] = useState(
		Box.From(defaultPosition)
	)
	const [stabilizedToolbarPosition, setStabilizedToolbarPosition] = useState({
		x: defaultPosition.x,
		y: defaultPosition.y,
	})
	const [isEditingLink, setIsEditingLink] = useState(false)
	const textEditor: TextEditor = useValue('textEditor', () => editor.getEditingShapeTextEditor(), [
		editor,
	])
	const selectionToPageBox = useValue('selectionToPageBox', () => editor.getSelectionToPageBox(), [
		editor,
	])
	const [textEditorState, setTextEditorState] = useState<TextEditorState | null>(textEditor?.state)
	const [isSelectingText, setIsSelectingText] = useState(false)
	const [shouldAllowToolbarClick, setShouldAllowToolbarClick] = useState(false)
	const hasSelection = !textEditorState?.selection.empty

	useEffect(() => {
		const handleMouseDown = () => {
			setIsSelectingText(true)
			setShouldAllowToolbarClick(hasSelection)
		}

		const handleMouseUp = () => {
			setIsSelectingText(false)
			setShouldAllowToolbarClick(true)
		}

		window.addEventListener('mousedown', handleMouseDown)
		window.addEventListener('mouseup', handleMouseUp)

		return () => {
			window.removeEventListener('mousedown', handleMouseDown)
			window.removeEventListener('mouseup', handleMouseUp)
		}
	}, [hasSelection])

	useEffect(() => {
		if (!textEditor) {
			setTextEditorState(null)
			return
		}

		const handleTransaction = ({ editor: textEditor }: TextEditorEvents['transaction']) => {
			setTextEditorState(textEditor.state)
		}
		const handleClick = () => {
			setIsEditingLink(textEditor.isActive('link'))
		}

		textEditor.on('transaction', handleTransaction)
		textEditor.view.dom.addEventListener('click', handleClick)

		return () => {
			textEditor.off('transaction', handleTransaction)
			textEditor.view.dom.removeEventListener('click', handleClick)
			setTextEditorState(null)
		}
	}, [textEditor])

	// Based on the start and end of the selection calculate the position at the center top.
	const selectionBounds = getTextSelectionBounds(editor, textEditor)
	const toolbarPosition = useContextualToolbarPosition({
		hasSelection: hasSelection && textEditor && shouldAllowToolbarClick,
		toolbarRef,
		selectionBounds,
	})

	const handleEditLinkIntent = () => setIsEditingLink(true)
	const handleLinkComplete = () => setIsEditingLink(false)

	// This helps make the toolbar less spastic as the selection changes.
	const isSelectionOnSameLine = previousTop.current === stabilizedToolbarPosition.y
	previousTop.current = stabilizedToolbarPosition.y

	useEffect(() => {
		toolbarRef.current?.setAttribute('data-is-selecting-text', isSelectingText.toString())
		toolbarRef.current?.setAttribute(
			'data-is-selection-on-same-line',
			isSelectionOnSameLine.toString()
		)
	}, [hasSelection, isSelectingText, isSelectionOnSameLine])

	useEffect(() => {
		if (toolbarPosition.y === defaultPosition.y) return

		const areSelectionBoundsUpdated = !areObjectsShallowEqual(
			selectionToPageBox,
			currentSelectionToPageBox
		)

		// A bit annoying but we need to stabilize the toolbar position so it doesn't jump around when modifying the rich text.
		// The issue stems from the fact that coordsAtPos provides slightly different results for the same general position.
		const hasXPositionChangedEnough =
			areSelectionBoundsUpdated || Math.abs(toolbarPosition.x - stabilizedToolbarPosition.x) > 10
		const hasYPositionChangedEnough =
			areSelectionBoundsUpdated || Math.abs(toolbarPosition.y - stabilizedToolbarPosition.y) > 10
		if (hasXPositionChangedEnough || hasYPositionChangedEnough) {
			setStabilizedToolbarPosition({
				x: hasXPositionChangedEnough ? toolbarPosition.x : stabilizedToolbarPosition.x,
				y: hasYPositionChangedEnough ? toolbarPosition.y : stabilizedToolbarPosition.y,
			})
		}

		if (areSelectionBoundsUpdated) {
			setCurrentSelectionToPageBox(selectionToPageBox)
		}
	}, [toolbarPosition, stabilizedToolbarPosition, selectionToPageBox, currentSelectionToPageBox])

	if (!textEditor || !shouldShowToolbar(editor, textEditorState)) return null

	return (
		<TldrawUiContextualToolbar
			ref={toolbarRef}
			className="tl-rich-text__toolbar"
			position={stabilizedToolbarPosition}
			isVisible={hasSelection}
			indicatorOffset={toolbarPosition.indicatorOffset}
		>
			{children ? (
				children
			) : isEditingLink ? (
				<LinkEditor
					textEditor={textEditor}
					value={textEditor.isActive('link') ? textEditor.getAttributes('link').href : ''}
					onComplete={handleLinkComplete}
				/>
			) : (
				<DefaultRichTextToolbarItems
					textEditor={textEditor}
					onEditLinkIntent={handleEditLinkIntent}
				/>
			)}
		</TldrawUiContextualToolbar>
	)
})

function shouldShowToolbar(editor: Editor, textEditorState: TextEditorState | null) {
	const showToolbar = editor.isInAny('select.editing_shape')

	if (!showToolbar) return false
	if (!textEditorState) return false

	return true
}

interface Coordinates {
	top: number
	bottom: number
	left: number
	right: number
}

const defaultPosition = {
	x: -1000,
	y: -1000,
	w: 0,
	h: 0,
}

function getTextSelectionBounds(editor: Editor, textEditor: TextEditor) {
	if (!textEditor) return Box.From(defaultPosition)

	const container = editor.getContainer()
	const { view } = textEditor
	const { selection } = view.state
	let fromPos: Coordinates
	let toPos: Coordinates
	try {
		fromPos = Object.assign({}, view.coordsAtPos(selection.from))
		toPos = Object.assign({}, view.coordsAtPos(selection.to, -1))

		// Need to account for the view being positioned within the container not just the entire
		// window.
		const adjustPosition = (pos: Coordinates, containerRect: DOMRect) => {
			pos.top -= containerRect.top
			pos.bottom -= containerRect.top
			pos.left -= containerRect.left
			pos.right -= containerRect.left
		}

		const containerRect = container.getBoundingClientRect()
		adjustPosition(fromPos, containerRect)
		adjustPosition(toPos, containerRect)
	} catch {
		return Box.From(defaultPosition)
	}

	// Ensure that start < end for the menu to be positioned correctly.
	const coords = {
		top: Math.min(fromPos.top, toPos.top),
		bottom: Math.max(fromPos.bottom, toPos.bottom),
		left: Math.min(fromPos.left, toPos.left),
		right: Math.max(fromPos.right, toPos.right),
	}

	return Box.From({
		x: coords.left,
		y: coords.top,
		w: coords.right - coords.left,
		h: coords.bottom - coords.top,
	})
}
