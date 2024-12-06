import {
	getMarkRange,
	Range,
	Editor as TextEditor,
	EditorEvents as TextEditorEvents,
} from '@tiptap/core'
import { MarkType } from '@tiptap/pm/model'
import { EditorState as TextEditorState } from '@tiptap/pm/state'
import { areObjectsShallowEqual, Box, Editor, track, useEditor, useValue } from '@tldraw/editor'
import React, { useEffect, useRef, useState } from 'react'
import { useContextualToolbarPosition } from '../../hooks/useContextualToolbarPosition'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { TldrawUiContextualToolbar } from '../primitives/TldrawUiContextualToolbar'
import { DefaultRichTextToolbarItems } from './DefaultRichTextToolbarItems'
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
	const toolbarRef = useRef<HTMLDivElement>(null)
	const previousTop = useRef(defaultPosition.y)
	const isCoarsePointer = useValue(
		'isCoarsePointer',
		() => editor.getInstanceState().isCoarsePointer,
		[editor]
	)
	const [currentCamera, setCurrentCamera] = useState(editor.getCamera())
	const [stabilizedToolbarPosition, setStabilizedToolbarPosition] = useState({
		x: defaultPosition.x,
		y: defaultPosition.y,
	})
	const [isEditingLink, setIsEditingLink] = useState(false)
	const [wasJustEditingLink, setWasJustEditingLink] = useState(false)
	const textEditor: TextEditor | null = useValue(
		'textEditor',
		() => editor.getEditingShapeTextEditor(),
		[editor]
	)
	const camera = useValue('camera', () => editor.getCamera(), [editor])
	const [textEditorState, setTextEditorState] = useState<TextEditorState | null>(
		textEditor?.state ?? null
	)
	const [isMousingDown, setIsMousingDown] = useState(false)
	const [isMousingAround, setIsMousingAround] = useState(false)
	const hasTextSelection = !textEditorState?.selection.empty

	// Set up general event listeners for text selection.
	useEffect(() => {
		const handleMouseDown = () => setIsMousingDown(true)
		const handleMouseUp = () => setIsMousingDown(false)
		const handleMouseMove = () => setIsMousingAround(true)
		const handleKeyDown = () => !isEditingLink && setIsMousingAround(false)
		window.addEventListener('mousedown', handleMouseDown)
		window.addEventListener('mouseup', handleMouseUp)
		window.addEventListener('mousemove', handleMouseMove)
		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('mousedown', handleMouseDown)
			window.removeEventListener('mouseup', handleMouseUp)
			window.removeEventListener('mousemove', handleMouseMove)
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [hasTextSelection, isEditingLink])

	// Set up text editor transaction listener.
	useEffect(() => {
		if (!textEditor) {
			setTextEditorState(null)
			return
		}

		const handleTransaction = ({ editor: textEditor }: TextEditorEvents['transaction']) => {
			setTextEditorState(textEditor.state)
		}

		textEditor.on('transaction', handleTransaction)
		return () => {
			textEditor.off('transaction', handleTransaction)
			setTextEditorState(null)
		}
	}, [textEditor])

	// Set up text editor event listeners.
	useEffect(() => {
		if (!textEditor) {
			return
		}

		const handleClick = () => {
			const isLinkActive = textEditor.isActive('link')
			setWasJustEditingLink(isEditingLink)
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
			const { from, to } = getMarkRange(
				textEditor.state.doc.resolve(textEditor.state.selection.from),
				textEditor.schema.marks.link as MarkType
			) as Range
			// Select the entire link if we just clicked on it while in edit mode, but not if there's
			// a specific selection.
			if (textEditor.state.selection.empty) {
				textEditor.commands.setTextSelection({ from, to })
			}
		}
	}, [textEditor, isEditingLink])

	// Based on the start and end of the selection calculate the position at the center top.
	const selectionBounds = getTextSelectionBounds(editor, textEditor)
	const isVisible =
		!!textEditor &&
		!!textEditorState &&
		editor.isInAny('select.editing_shape') &&
		(isMousingAround || isCoarsePointer) &&
		(hasTextSelection || textEditor.isActive('link'))
	const toolbarPosition = useContextualToolbarPosition({
		isVisible,
		toolbarRef,
		selectionBounds,
	})

	const handleEditLinkIntent = () => setIsEditingLink(true)
	const handleLinkComplete = () => {
		if (!textEditor) return
		setWasJustEditingLink(true)
		setIsEditingLink(false)
		setIsMousingAround(false)
		const from = textEditor.state.selection.from
		textEditor.commands.setTextSelection({ from, to: from })
	}

	// This helps make the toolbar less spastic as the selection changes.
	const isSelectionOnSameLine = previousTop.current === stabilizedToolbarPosition.y
	previousTop.current = stabilizedToolbarPosition.y
	useEffect(() => {
		toolbarRef.current?.setAttribute('data-is-mousing-down', isMousingDown.toString())
		toolbarRef.current?.setAttribute(
			'data-is-selection-on-same-line',
			isSelectionOnSameLine.toString()
		)
	}, [hasTextSelection, isMousingDown, isSelectionOnSameLine])

	// A bit annoying but we need to stabilize the toolbar position so it doesn't jump around
	// when modifying the rich text. The issue stems from the fact that coordsAtPos provides
	// slightly different results for the same general position.
	// However, if the camera has moved, forget the stabilization logic, just update the positions.
	useEffect(() => {
		if (toolbarPosition.y === defaultPosition.y || isEditingLink) return

		const hasCameraMoved = !areObjectsShallowEqual(camera, currentCamera)

		const threshold = 10
		const hasXPositionChangedEnough =
			hasCameraMoved || Math.abs(toolbarPosition.x - stabilizedToolbarPosition.x) > threshold
		const hasYPositionChangedEnough =
			hasCameraMoved || Math.abs(toolbarPosition.y - stabilizedToolbarPosition.y) > threshold
		if (hasXPositionChangedEnough || hasYPositionChangedEnough) {
			setStabilizedToolbarPosition({
				x: hasXPositionChangedEnough ? toolbarPosition.x : stabilizedToolbarPosition.x,
				y: hasYPositionChangedEnough ? toolbarPosition.y : stabilizedToolbarPosition.y,
			})
		}

		if (hasCameraMoved) {
			setCurrentCamera(camera)
		}
	}, [toolbarPosition, stabilizedToolbarPosition, camera, currentCamera, isEditingLink])

	// The toolbar can get a _lot_ of updates because the textEditor state changes so much.
	// That can make it cycle pretty quickly through isVisible and toolbarPosition states.
	// This helps take the stabilizedPosition and visibility states and make them less jittery.
	const debouncedToolbarPosition = useDebouncedValue(toolbarPosition, 150)
	const debouncedIsVisible = useDebouncedValue(isVisible, 150)

	// N.B. One tactic here that could have been done is to, if there is no textEditor or we're
	// not in editing text mode, that we just return null and not render the toolbar. However,
	// because we want the toolbar to smoothly animate in-and-out of view we keep it around.

	return (
		<TldrawUiContextualToolbar
			ref={toolbarRef}
			className="tl-rich-text__toolbar"
			position={debouncedToolbarPosition}
			isVisible={debouncedIsVisible}
			indicatorOffset={toolbarPosition.indicatorOffset}
		>
			{children ? (
				children
			) : textEditor && (isEditingLink || (wasJustEditingLink && !isVisible)) ? (
				<LinkEditor
					textEditor={textEditor}
					value={textEditor.isActive('link') ? textEditor.getAttributes('link').href : ''}
					onComplete={handleLinkComplete}
				/>
			) : textEditor ? (
				<DefaultRichTextToolbarItems
					textEditor={textEditor}
					onEditLinkIntent={handleEditLinkIntent}
				/>
			) : null}
		</TldrawUiContextualToolbar>
	)
})

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

function getTextSelectionBounds(editor: Editor, textEditor: TextEditor | null) {
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
	// Sometimes the coords can be NaN and we need to exclude those.
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
