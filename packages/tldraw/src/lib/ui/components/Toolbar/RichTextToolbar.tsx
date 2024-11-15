import { TLCamera, TLShape, track, useEditor, useValue, Vec } from '@tldraw/editor'
import { setBlockType, toggleMark } from 'prosemirror-commands'
import { Attrs, MarkType, NodeType, Schema } from 'prosemirror-model'
import { liftListItem, wrapInList } from 'prosemirror-schema-list'
import { findParentNode } from 'prosemirror-utils'
import { EditorView } from 'prosemirror-view'
import { useEffect, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'

/** @public @react */
export const RichTextToolbar = track(function RichTextToolbar() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'rich-text-menu'
	const [currentShape, setCurrentShape] = useState<TLShape | null>()
	const [currentCoordinates, setCurrentCoordinates] = useState<Vec>()
	const [currentCamera, setCurrentCamera] = useState<TLCamera>(editor.getCamera())

	const showToolbar = editor.isInAny('select.editing_shape')
	const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds()
	const camera = editor.getCamera()
	const selectedShape = editor.getOnlySelectedShape()
	const pageCoordinates = selectionRotatedPageBounds
		? editor.pageToViewport(selectionRotatedPageBounds.point)
		: null
	const textEditor: EditorView = useValue('textEditor', () => editor.getEditingShapeTextEditor(), [
		editor,
	])
	const schema = editor.getTextOptions().proseMirrorConfig?.schema
	const [textEditorState, setTextEditorState] = useState(textEditor?.state)

	useEffect(() => {
		if (
			pageCoordinates &&
			((selectedShape && !currentShape) ||
				selectedShape?.id !== currentShape?.id ||
				currentCamera.x !== camera.x ||
				currentCamera.y !== camera.y ||
				currentCamera.z !== camera.z)
		) {
			if (!currentCoordinates || !currentCoordinates.equals(pageCoordinates)) {
				setCurrentCoordinates(pageCoordinates)
			}
		}
		if (!showToolbar) {
			setCurrentShape(null)
		} else {
			setCurrentShape(selectedShape)
		}
		setCurrentCamera(camera)
	}, [
		selectedShape,
		currentShape,
		currentCoordinates,
		pageCoordinates,
		showToolbar,
		camera,
		currentCamera,
	])

	useEffect(() => {
		const onRichTextTransaction = (info: any) => {
			setTextEditorState(info.state)
		}
		editor.on('rich-text-transaction', onRichTextTransaction)
		return () => {
			editor.off('rich-text-transaction', onRichTextTransaction)
		}
	}, [editor])

	if (!showToolbar) return null
	if (!selectionRotatedPageBounds) return null
	if (!currentCoordinates) return null
	if (!textEditor) return null
	if (!schema) return null
	if (!textEditorState) return null

	const { $from } = textEditorState.selection
	const isBulletedList = !!findParentNode((node) => node.type === schema.nodes.bullet_list)(
		textEditorState.selection
	)
	const isHeader = $from.parent.type === schema.nodes.heading

	return (
		<div
			className="tl-rich-text__toolbar"
			style={{
				top: Math.floor(Math.max(16, currentCoordinates.y - 64)),
				left: Math.floor(Math.max(16, currentCoordinates.x)),
				width: Math.floor(selectionRotatedPageBounds.width * editor.getZoomLevel()),
			}}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div className="tlui-toolbar__tools" role="radiogroup">
				<TldrawUiButton
					title={msg('tool.rich-text-bold')}
					type="icon"
					onClick={() => {
						trackEvent('rich-text', { operation: 'bold', source })
						applyInlineStyle(textEditor, schema.marks.strong)
					}}
				>
					<TldrawUiButtonIcon small icon="bold" />
				</TldrawUiButton>
				<TldrawUiButton
					title={msg('tool.rich-text-strikethrough')}
					type="icon"
					onClick={() => {
						trackEvent('rich-text', { operation: 'strikethrough', source })
						applyInlineStyle(textEditor, schema.marks.strikethrough)
					}}
				>
					<TldrawUiButtonIcon small icon="strikethrough" />
				</TldrawUiButton>
				<TldrawUiButton
					title={msg('tool.rich-text-link')}
					type="icon"
					onClick={() => {
						trackEvent('rich-text', { operation: 'link', source })
						// todo
					}}
				>
					<TldrawUiButtonIcon small icon="link" />
				</TldrawUiButton>
				<TldrawUiButton
					title={msg('tool.rich-text-header')}
					type="icon"
					isActive={isHeader}
					onClick={() => {
						trackEvent('rich-text', { operation: 'header', source })
						if (isHeader) {
							applyBlockType(textEditor, schema, schema.nodes.paragraph)
						} else {
							applyBlockType(textEditor, schema, schema.nodes.heading, { level: 3 })
						}
					}}
				>
					<TldrawUiButtonIcon small icon="header" />
				</TldrawUiButton>
				<TldrawUiButton
					title={msg('tool.rich-text-bulleted-list')}
					type="icon"
					isActive={isBulletedList}
					onClick={() => {
						trackEvent('rich-text', { operation: 'bulleted-list', source })
						if (isBulletedList) {
							applyBlockType(textEditor, schema, schema.nodes.paragraph)
						} else {
							applyListType(textEditor, schema, schema.nodes.bullet_list)
						}
					}}
				>
					<TldrawUiButtonIcon small icon="bulleted-list" />
				</TldrawUiButton>
			</div>
		</div>
	)
})

export function wrapTextEditorCommand(fn: (...args: any[]) => void) {
	return (textEditor: EditorView, ...args: any[]) => {
		fn(textEditor, ...args)
		textEditor.focus()
	}
}

export const applyInlineStyle = wrapTextEditorCommand((textEditor: EditorView, type: MarkType) => {
	toggleMark(type)(textEditor.state, textEditor.dispatch, textEditor)
})

export const applyBlockType = wrapTextEditorCommand(
	(textEditor: EditorView, schema: Schema, type: NodeType, attrs?: Attrs | null) => {
		const { state, dispatch } = textEditor
		const transaction = state.tr

		// Remove any list items if present.
		liftListItem(schema.nodes.list_item)(state.apply(transaction), dispatch)

		// Set the block type to the specified type (e.g. heading).
		setBlockType(type, attrs)(state.apply(transaction), dispatch)
	}
)

export const applyListType = wrapTextEditorCommand(
	(textEditor: EditorView, schema: Schema, type: NodeType) => {
		const { state, dispatch } = textEditor
		const transaction = state.tr

		// Remove any header block if present.
		setBlockType(schema.nodes.paragraph)(state.apply(transaction), dispatch)
		wrapInList(type)(state.apply(transaction), dispatch)
	}
)
