import { preventDefault, stopEventPropagation, useEditor, useUniqueSafeId } from '@tldraw/editor'
import { exampleSetup } from 'prosemirror-example-setup'
import { Node } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { forwardRef, useEffect, useState } from 'react'
import { renderPlaintextFromRichText } from '../../utils/text/richText'

interface TextAreaProps {
	isEditing: boolean
	text: string
	richText?: string
	handleFocus(): void
	handleBlur(): void
	handleKeyDown(e: React.KeyboardEvent<HTMLDivElement | HTMLTextAreaElement>): void
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
		handleKeyDown,
		handleBlur,
		// TODO: need to handle this still?
		// handleInputPointerDown,
		handleDoubleClick,
	},
	ref
) {
	const [view, setView] = useState<EditorView | null>(null)
	const proseMirrorId = useUniqueSafeId('prose-mirror-editor')
	const editor = useEditor()

	useEffect(() => {
		if (!isEditing) {
			if (view) {
				view.destroy()
				setView(null)
			}
			return
		}

		const proseMirrorConfig = editor.getTextOptions().proseMirrorConfig
		const schema = proseMirrorConfig?.schema
		if (!schema) return
		const newView = new EditorView(document.querySelector(`#${proseMirrorId}`), {
			editable: () => isEditing,
			state: EditorState.create({
				schema,
				doc: richText
					? Node.fromJSON(schema, JSON.parse(richText))
					: plaintext
						? schema.node('doc', {}, [schema.node('paragraph', {}, [schema.text(plaintext)])])
						: undefined,
				plugins: exampleSetup({ schema: schema, menuBar: false }),
				...proseMirrorConfig?.plugins,
			}),
			handleDOMEvents: {
				handleBlur: () => {
					handleBlur()
				},
				handleKeyDown: (view, event) => {
					handleKeyDown(event)
				},
				handleFocus: () => {
					handleFocus()
				},
				handleDoubleClick: (view, event) => {
					handleDoubleClick(event)
				},
			},
			dispatchTransaction(transaction) {
				const newState = newView.state.apply(transaction)
				newView.updateState(newState)
				const json = JSON.stringify(newState.doc.toJSON())
				// This is a quick and dirty way to determine if the text is just plaintext or if it's rich text.
				const isPlaintext = !json.includes(`"marks"`) && !json.includes(`"list_item"`)
				if (isPlaintext) {
					const plaintext = renderPlaintextFromRichText(editor, json)
					// There is a 'short-circuit' path here. If it's just plaintext, we don't need to do anything fancy.
					handleChange({ plaintext })
				} else {
					handleChange({ richText: json })
				}
			},
		})
		setView(newView)

		return () => newView.destroy()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isEditing])

	useEffect(() => {
		// We technically only need this for the TextShapeUtil but it helps in general.
		if (isEditing && view) {
			view.focus()
		}
	}, [isEditing, view])

	if (!isEditing) return null

	return (
		<div
			id={proseMirrorId}
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
		/>
	)
})

export const PlainTextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
	{
		isEditing,
		text,
		handleFocus,
		handleChange,
		handleKeyDown,
		handleBlur,
		handleInputPointerDown,
		handleDoubleClick,
	},
	ref
) {
	const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		handleChange({ plaintext: e.target.value })
	}

	return (
		<textarea
			ref={ref}
			className="tl-text tl-text-input"
			name="text"
			tabIndex={-1}
			readOnly={!isEditing}
			autoComplete="off"
			autoCapitalize="off"
			autoCorrect="off"
			autoSave="off"
			placeholder=""
			spellCheck="true"
			wrap="off"
			dir="auto"
			defaultValue={text}
			onFocus={handleFocus}
			onChange={onChange}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
			onTouchEnd={stopEventPropagation}
			onContextMenu={isEditing ? stopEventPropagation : undefined}
			onPointerDown={handleInputPointerDown}
			onDoubleClick={handleDoubleClick}
			// On FF, there's a behavior where dragging a selection will grab that selection into
			// the drag event. However, once the drag is over, and you select away from the textarea,
			// starting a drag over the textarea will restart a selection drag instead of a shape drag.
			// This prevents that default behavior in FF.
			onDragStart={preventDefault}
		/>
	)
})
