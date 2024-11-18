import { preventDefault, stopEventPropagation, useEditor, useUniqueSafeId } from '@tldraw/editor'
import { forwardRef, useEffect } from 'react'
import { renderPlaintextFromRichText } from '../../utils/text/richText'

import { EditorEvents, EditorProvider } from '@tiptap/react'

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

	const handleCreate = (props: EditorEvents['create']) => {
		editor.setEditingShapeTextEditor(props.editor)
	}

	useEffect(() => {
		if (!isEditing) {
			editor.setEditingShapeTextEditor(null)
		}
	}, [editor, isEditing])

	const handleUpdate = (props: EditorEvents['update']) => {
		const {
			editor: { state },
		} = props
		const json = JSON.stringify(state.doc.toJSON())
		// This is a quick and dirty way to determine if the text is just plaintext or if it's rich text.
		const isPlaintext =
			!json.includes(`"marks"`) && !json.includes(`"list_item"`) && !json.includes(`"heading"`)
		if (isPlaintext) {
			const plaintext = renderPlaintextFromRichText(editor, json)
			// There is a 'short-circuit' path here. If it's just plaintext, we don't need to do anything fancy.
			handleChange({ plaintext })
		} else {
			handleChange({ richText: json })
		}
	}

	if (!isEditing) return null
	if (!tipTapConfig) return null

	const content = richText ? JSON.parse(richText) : plaintext

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
