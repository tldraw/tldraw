import { EditorEvents, EditorProvider } from '@tiptap/react'
import {
	preventDefault,
	stopEventPropagation,
	TLShapeId,
	useEditor,
	useUniqueSafeId,
} from '@tldraw/editor'
import { forwardRef, useEffect, useState } from 'react'

/** @internal */
export interface TextAreaProps {
	isEditing: boolean
	text: string
	richText?: string
	handleFocus(): void
	handleBlur(): void
	handleKeyDown(e: KeyboardEvent): void
	handleChange(changeInfo: { plaintext?: string; richText?: string }): void
	handleInputPointerDown(e: React.PointerEvent<HTMLTextAreaElement>): void
	handleDoubleClick(e: any): any
}

export const RichTextArea = forwardRef<HTMLDivElement, TextAreaProps>(function TextArea(
	{
		isEditing,
		text: plaintext,
		richText,
		handleFocus,
		handleChange,
		handleBlur,
		handleKeyDown,
		// TODO: need to handle this still?
		// handleInputPointerDown,
		handleDoubleClick,
	},
	ref
) {
	const tipTapId = useUniqueSafeId('tip-tap-editor')
	const editor = useEditor()
	const tipTapConfig = editor.getTextOptions().tipTapConfig
	const [shouldSelectAllOnCreate, setShouldSelectAllOnCreate] = useState(false)

	const handleCreate = (props: EditorEvents['create']) => {
		editor.setEditingShapeTextEditor(props.editor)
		if (shouldSelectAllOnCreate) {
			props.editor.chain().focus().selectAll().run()
		}
	}

	useEffect(() => {
		if (!isEditing) {
			editor.setEditingShapeTextEditor(null)
		}
	}, [editor, isEditing])

	useEffect(() => {
		function selectAllIfEditing(event: { shapeId: TLShapeId }) {
			if (event.shapeId === editor.getEditingShapeId()) {
				setShouldSelectAllOnCreate(true)
			}
		}

		editor.on('select-all-text', selectAllIfEditing)
		return () => {
			editor.off('select-all-text', selectAllIfEditing)
			setShouldSelectAllOnCreate(false)
		}
	}, [editor, isEditing])

	const handleUpdate = (props: EditorEvents['update']) => {
		const {
			editor: { state },
		} = props
		const json = JSON.stringify(state.doc.toJSON())
		handleChange({ richText: json })
	}

	if (!isEditing) return null
	if (!tipTapConfig) return null

	const content = richText ? JSON.parse(richText) : plaintext.split('\n').join('<br />')

	return (
		<div
			id={tipTapId}
			ref={ref}
			tabIndex={-1}
			className="tl-rich-text tl-text tl-text-input"
			onTouchEnd={stopEventPropagation}
			onContextMenu={isEditing ? stopEventPropagation : undefined}
			onPointerDownCapture={stopEventPropagation}
			// On FF, there's a behavior where dragging a selection will grab that selection into
			// the drag event. However, once the drag is over, and you select away from the textarea,
			// starting a drag over the textarea will restart a selection drag instead of a shape drag.
			// This prevents that default behavior in FF.
			onDragStart={preventDefault}
		>
			<div className="tl-rich-text-tiptap">
				<EditorProvider
					autofocus
					editable={isEditing}
					onUpdate={handleUpdate}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onCreate={handleCreate}
					editorProps={{
						handleKeyDown: (view, event) => {
							handleKeyDown(event)
						},
						handleDoubleClick: (view, pos, event) => {
							handleDoubleClick(event)
						},
						...tipTapConfig.editorProps,
					}}
					{...tipTapConfig}
					content={content}
				/>
			</div>
		</div>
	)
})
