import { preventDefault, stopEventPropagation, useUniqueSafeId } from '@tldraw/editor'
import { exampleSetup } from 'prosemirror-example-setup'
import { Node, Schema } from 'prosemirror-model'
import { schema } from 'prosemirror-schema-basic'
import { addListNodes } from 'prosemirror-schema-list'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { forwardRef, useEffect, useState } from 'react'

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

// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
/** @internal */
export const tldrawProseMirrorSchema = new Schema({
	nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
	marks: schema.spec.marks,
})

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

	useEffect(() => {
		if (!isEditing) {
			if (view) {
				view.destroy()
				setView(null)
			}
			return
		}

		const newView = new EditorView(document.querySelector(`#${proseMirrorId}`), {
			editable: () => isEditing,
			state: EditorState.create({
				schema: tldrawProseMirrorSchema,
				doc: richText
					? Node.fromJSON(tldrawProseMirrorSchema, JSON.parse(richText))
					: plaintext
						? tldrawProseMirrorSchema.node('doc', {}, [
								tldrawProseMirrorSchema.node('paragraph', {}, [
									tldrawProseMirrorSchema.text(plaintext),
								]),
							])
						: undefined,
				plugins: exampleSetup({ schema: tldrawProseMirrorSchema, menuBar: false }),
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
				const isPlaintext = !json.includes(`"marks"`)
				if (isPlaintext) {
					// There is a 'short-circuit' path here. If it's just plaintext, we don't need to do anything fancy.
					handleChange({ plaintext: newState.doc.textContent })
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
