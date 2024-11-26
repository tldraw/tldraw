import { Editor as TextEditor, EditorEvents as TextEditorEvents } from '@tiptap/core'
import { EditorState as TextEditorState } from '@tiptap/pm/state'
import {
	Editor,
	TLCamera,
	Vec,
	stopEventPropagation,
	track,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useValue,
} from '@tldraw/editor'
import { RefObject, useEffect, useRef, useState } from 'react'
import useViewportHeight from '../../hooks/useViewportHeight'
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
	const [currentCoordinates, setCurrentCoordinates] = useState<Vec>()
	const [currentCamera, setCurrentCamera] = useState<TLCamera>(editor.getCamera())
	const toolbarRef = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(toolbarRef.current)
	usePassThroughMouseOverEvents(toolbarRef.current)
	const previousTop = useRef(defaultPosition.top)
	const [isEditingLink, setIsEditingLink] = useState(false)
	const textEditor: TextEditor = useValue('textEditor', () => editor.getEditingShapeTextEditor(), [
		editor,
	])
	const [textEditorState, setTextEditorState] = useState<TextEditorState | null>(textEditor?.state)
	const [isSelectingText, setSelectingText] = useState(false)
	const [shouldAllowToolbarClick, setShouldAllowToolbarClick] = useState(false)
	const hasSelection = !textEditorState?.selection.empty

	const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds()
	const camera = editor.getCamera()
	const pageCoordinates = selectionRotatedPageBounds
		? editor.pageToViewport(selectionRotatedPageBounds.point)
		: null

	// This is to ensure the toolbar follows the selection when the camera moves.
	useEffect(() => {
		if (
			pageCoordinates &&
			(currentCamera.x !== camera.x || currentCamera.y !== camera.y || currentCamera.z !== camera.z)
		) {
			if (!currentCoordinates || !currentCoordinates.equals(pageCoordinates)) {
				setCurrentCoordinates(pageCoordinates)
			}
		}
		setCurrentCamera(camera)
	}, [currentCoordinates, pageCoordinates, camera, currentCamera])

	useEffect(() => {
		const handleMouseDown = () => {
			setSelectingText(true)
			setShouldAllowToolbarClick(hasSelection)
		}

		const handleMouseUp = () => {
			setSelectingText(false)
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

	const toolbarPosition = usePosition({
		hasSelection,
		toolbarRef,
		textEditor,
		shouldAllowToolbarClick,
	})

	if (!textEditor || !shouldShowToolbar(editor, textEditorState)) return null

	const handleEditLinkIntent = () => setIsEditingLink(true)
	const handleLinkComplete = () => setIsEditingLink(false)

	const isSelectionOnSameLine = previousTop.current === toolbarPosition.top
	previousTop.current = toolbarPosition.top

	return (
		<div
			ref={toolbarRef}
			className="tl-rich-text__toolbar"
			data-has-selection={hasSelection}
			data-is-selecting-text={isSelectingText}
			data-is-selection-on-same-line={isSelectionOnSameLine}
			data-is-mobile={toolbarPosition.isMobile}
			style={{
				top: `${toolbarPosition.top}px`,
				left: `${toolbarPosition.left}px`,
			}}
			onPointerDown={stopEventPropagation}
		>
			<div
				className="tl-rich-text__toolbar-indicator"
				style={{ left: `calc(50% - var(--arrow-size) - ${toolbarPosition.offset}px)` }}
			/>
			<div className="tlui-toolbar__tools" role="radiogroup">
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
			</div>
		</div>
	)
})

function shouldShowToolbar(editor: Editor, textEditorState: TextEditorState | null) {
	const showToolbar = editor.isInAny('select.editing_shape')

	if (!showToolbar) return false
	if (!textEditorState) return false

	return true
}

const defaultPosition = {
	top: -1000,
	left: -1000,
	offset: 0,
	visible: false,
	isMobile: false,
}

interface Coordinates {
	top: number
	bottom: number
	left: number
	right: number
}

/*!
 * BSD License: https://github.com/outline/rich-markdown-editor/blob/main/LICENSE
 * Copyright (c) 2020 General Outline, Inc (https://www.getoutline.com/) and individual contributors.
 *
 * Modified from FloatingToolbar.tsx -> usePosition
 * https://github.com/outline/rich-markdown-editor/blob/main/src/components/FloatingToolbar.tsx
 *
 * The Outline editor was a Dropbox Paper clone, and I worked on Dropbox Paper as a founding engineer.
 * Now I'm working at tldraw adding rich text features to the editor and bringing those Paper/Outline
 * ideas to the tldraw editor using some Outline logic.
 * It all comes full circle! :)
 *
 * Returns the position of the toolbar based on the current selection in the editor.
 *
 * @public
 */
function usePosition({
	hasSelection,
	toolbarRef,
	textEditor,
	shouldAllowToolbarClick,
}: {
	hasSelection: boolean
	toolbarRef: RefObject<HTMLDivElement>
	textEditor: TextEditor
	shouldAllowToolbarClick: boolean
}) {
	const editor = useEditor()
	const container = editor.getContainer()
	const isCoarsePointer = useValue(
		'isCoarsePointer',
		() => editor.getInstanceState().isCoarsePointer,
		[editor]
	)
	const viewportHeight = useViewportHeight()

	if (!textEditor || !toolbarRef?.current) return defaultPosition
	const { view } = textEditor
	const { selection } = view.state
	const { width: menuWidth, height: menuHeight } = toolbarRef.current.getBoundingClientRect()

	if (!hasSelection || !menuWidth || !menuHeight || !shouldAllowToolbarClick) {
		return defaultPosition
	}

	if (isCoarsePointer) {
		return {
			top: viewportHeight - menuHeight - 16,
			left: container.clientWidth / 2 - menuWidth / 2,
			offset: 0,
			visible: true,
			isMobile: true,
		}
	}

	// Based on the start and end of the selection calculate the position at the center top.
	let fromPos: Coordinates
	let toPos: Coordinates
	try {
		fromPos = view.coordsAtPos(selection.from)
		toPos = view.coordsAtPos(selection.to, -1)

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
	} catch (err) {
		console.warn(err)
		return defaultPosition
	}

	// Ensure that start < end for the menu to be positioned correctly.
	const selectionBounds = {
		top: Math.min(fromPos.top, toPos.top),
		bottom: Math.max(fromPos.bottom, toPos.bottom),
		left: Math.min(fromPos.left, toPos.left),
		right: Math.max(fromPos.right, toPos.right),
	}

	// Calcluate the horizontal center of the selection.
	const halfSelection = Math.abs(selectionBounds.right - selectionBounds.left) / 2
	const centerOfSelection = selectionBounds.left + halfSelection

	// Position the menu so that it is centered over the selection except in
	// the cases where it would extend off the edge of the screen. In these
	// instances leave a margin.
	const margin = 16
	const left = Math.min(
		container.clientWidth - menuWidth - margin,
		Math.max(margin, centerOfSelection - menuWidth / 2)
	)
	const top = Math.min(
		container.clientHeight - menuHeight - margin,
		Math.max(margin, selectionBounds.top - menuHeight)
	)

	// If the menu has been offset to not extend offscreen then we should adjust
	// the position of the triangle underneath to correctly point to the center
	// of the selection still.
	const toolbarIndicatorPadding = 20
	const offset = Math.max(
		(-1 * menuWidth) / 2 + toolbarIndicatorPadding,
		Math.min(menuWidth / 2 - toolbarIndicatorPadding, left - (centerOfSelection - menuWidth / 2))
	)

	return {
		top: Math.round(top + container.scrollTop),
		left: Math.round(left + container.scrollLeft),
		offset: Math.round(offset),
		visible: true,
		isMobile: false,
	}
}
