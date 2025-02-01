import { EditorView } from '@tiptap/pm/view'
import { EditorEvents, EditorProvider, JSONContent, type Editor as TTEditor } from '@tiptap/react'
import {
	Editor,
	TLRichText,
	TLShapeId,
	preventDefault,
	stopEventPropagation,
	tlenv,
	useEditor,
	useUniqueSafeId,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef, useState } from 'react'

/** @public */
export interface TextAreaProps {
	isEditing: boolean
	text?: string
	shapeId: TLShapeId
	richText?: TLRichText
	handleFocus(): void
	handleBlur(): void
	handleKeyDown(e: KeyboardEvent): void
	handleChange(changeInfo: { plaintext?: string; richText?: TLRichText }): void
	handleInputPointerDown(e: React.PointerEvent<HTMLElement>): void
	handleDoubleClick(e: any): any
}

/**
 * N.B. In Development mode you need to ensure you're testing this without StrictMode on.
 * Otherwise it's not gonna work as expected on iOS.
 * Specifically, it means that the virtual keyboard won't pop open sometimes
 * (iOS starts flipping out when you render multiple times when trying to focus something) .
 */

/**
 * A rich text area that can be used for editing text with rich text formatting.
 * This component uses the TipTap editor under the hood.
 *
 * @public @react
 */
export const RichTextArea = React.forwardRef<HTMLDivElement, TextAreaProps>(function RichTextArea(
	{
		shapeId,
		isEditing,
		richText,
		handleFocus,
		handleChange,
		handleBlur: _handleBlur,
		handleKeyDown,
		// TODO: need to handle this still?
		// handleInputPointerDown,
		handleDoubleClick,
	},
	ref
) {
	const editor = useEditor()
	const tipTapId = useUniqueSafeId('tip-tap-editor')
	const tipTapConfig = editor.getTextOptions().tipTapConfig
	const [shouldSelectAllOnCreate, setShouldSelectAllOnCreate] = useState(false)
	const [initialPositionOnCreate, setInitialPositionOnCreate] = useState(
		null as { x: number; y: number } | null
	)

	const rTextEditor = useRef<TTEditor | null>(null)

	const handleCreate = useCallback(
		(props: EditorEvents['create']) => {
			if (editor.getEditingShapeId() !== shapeId) return

			const textEditor = props.editor
			editor.setEditingShapeTipTapTextEditor(textEditor)
			rTextEditor.current = textEditor

			// Either we select-all the text upon creation if desired.
			if (shouldSelectAllOnCreate) {
				textEditor.chain().focus().selectAll().run()
				setShouldSelectAllOnCreate(false)
			} else if (initialPositionOnCreate) {
				// Or, we place the caret at the intended clicked position, if
				// there was any (one could have also entered into editing
				// via Enter on the keyboard).
				const pos = textEditor.view.posAtCoords({
					left: initialPositionOnCreate.x,
					top: initialPositionOnCreate.y,
				})?.pos

				if (pos) {
					// Focus to that position.
					textEditor.chain().focus().setTextSelection(pos).run()
				} else {
					// Default to just focusing to the end of the editor content.
					textEditor.commands.focus('end')
				}
				setInitialPositionOnCreate(null)
			} else {
				// XXX: I don't love this. The setTimeout is because when creating a brand new shape
				// and double-clicking into it quickly to edit it, there's some kind of race condition
				// happening where the editor doesn't focus properly.
				editor.timers.setTimeout(() => textEditor.commands.focus('end'), 100)
			}
		},
		[editor, initialPositionOnCreate, shapeId, shouldSelectAllOnCreate]
	)

	useEffect(() => {
		// ? this doesn't make sense to me. In which case would isEditing (for this component)
		// be true but the editor's editing shape id not be the same as the shape id? That's what
		// isEditing checks, iirc. If the real ask is "does the editor have an editing shape, but that
		// shape is not the same as the shape id of this component", then that's a different question;
		// and that should prompt a different result, too. (e.g. don't clear the text editor)

		// It's possible that by the time this hook runs, that a new shape is now being edited.
		// Don't clear the text editor in that case.
		if (!isEditing && editor.getEditingShapeId() === shapeId) {
			editor.setEditingShapeTipTapTextEditor(null)
		}
	}, [editor, shapeId, isEditing])

	useEffect(() => {
		function selectAllIfEditing(event: { shapeId: TLShapeId }) {
			if (event.shapeId === editor.getEditingShapeId()) {
				setShouldSelectAllOnCreate(true)
			}
		}

		function placeCaret(event: { shapeId: TLShapeId; point: { x: number; y: number } }) {
			if (event.shapeId === editor.getEditingShapeId()) {
				setInitialPositionOnCreate(event.point)
			}
		}

		editor.on('select-all-text', selectAllIfEditing)
		editor.on('place-caret', placeCaret)
		return () => {
			editor.off('select-all-text', selectAllIfEditing)
			editor.off('place-caret', placeCaret)
		}
	}, [editor, isEditing])

	const handleUpdate = useCallback(
		(props: EditorEvents['update']) => {
			handleChange({ richText: props.editor.state.doc.toJSON() })
		},
		[handleChange]
	)

	const onKeyDown = useCallback(
		(view: EditorView, event: KeyboardEvent) => {
			if (event.key === 'Tab') {
				handleTab(editor, view, event)
			}

			handleKeyDown(event)
		},
		[editor, handleKeyDown]
	)

	const handleBlur = useCallback(() => {
		// ! flashbacks to previous terror... on iOS closing the virtual
		// keyboard WILL cause a blur event, but this event isn't caused
		// when we exit the editing state (because we remove the editor
		// before it has a chance to fire its blur event). So, we need to
		// manually exit the editing state here; so long as we can guarantee
		// that we're narrowing to just iOS.
		//
		// If we DONT do this then we won't actually blur the editor when
		// the user closes the keyboard, which will cause any subsequent
		// next shape creation to cause the editor to both open and close at
		// the same time, which is maybe a race condition, either way very
		// noticeably flakey and weird.
		if (tlenv.isSafari && tlenv.isIos) {
			if (editor.getEditingShapeId() === shapeId) {
				editor.setEditingShape(null)
			}
		}
		_handleBlur?.()
	}, [editor, _handleBlur, shapeId])

	if (!isEditing || !tipTapConfig) {
		return null
	}

	const { editorProps, ...restOfTipTapConfig } = tipTapConfig

	return (
		<div
			id={tipTapId}
			ref={ref}
			tabIndex={-1}
			data-testid="rich-text-area"
			className="tl-rich-text tl-text tl-text-input"
			onContextMenu={isEditing ? stopEventPropagation : undefined}
			// onPointerDownCapture={stopEventPropagation} // moving this to the pointer event extension
			// onTouchEnd={stopEventPropagation} // moving this to the pointer event extension
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
					immediatelyRender={true}
					shouldRerenderOnTransaction={false}
					editorProps={{
						handleKeyDown: onKeyDown,
						handleDoubleClick: (view, pos, event) => handleDoubleClick(event),
						...editorProps,
					}}
					{...restOfTipTapConfig}
					content={richText as JSONContent}
				/>
			</div>
		</div>
	)
})

// Prevent exiting the editor when hitting Tab.
// Also, insert a tab character at the front of the line if the shift key isn't pressed,
// otherwise if shift is pressed, remove a tab character from the front of the line.
function handleTab(editor: Editor, view: EditorView, event: KeyboardEvent) {
	// Don't exit the editor.
	event.preventDefault()

	const textEditor = editor.getEditingShapeTipTapTextEditor()
	if (textEditor?.isActive('bulletList') || textEditor?.isActive('orderedList')) return

	const { state, dispatch } = view
	const { $from, $to } = state.selection
	const isShift = event.shiftKey

	// Create a new transaction
	let tr = state.tr

	// Iterate over each line in the selection in reverse so that the positions
	// are stable as we modify the document.
	let pos = $to.end()
	while (pos >= $from.start()) {
		const line = state.doc.resolve(pos).blockRange()
		if (!line) break

		const lineStart = line.start
		const lineEnd = line.end
		const lineText = state.doc.textBetween(lineStart, lineEnd, '\n')

		// Check if the current line or any of its parent nodes are part of a list
		let isInList = false
		state.doc.nodesBetween(lineStart, lineEnd, (node) => {
			if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
				isInList = true
				return false // Stop iteration
			}
		})

		// TODO: for now skip over lists. Later, we might consider handling them using
		// sinkListItem and liftListItem from @tiptap/pm/schema-list
		if (!isInList) {
			if (!isShift) {
				// Insert a tab character at the start of the line
				tr = tr.insertText('\t', lineStart + 1)
			} else {
				// Remove a tab character from the start of the line
				if (lineText.startsWith('\t')) {
					tr = tr.delete(lineStart + 1, lineStart + 2)
				}
			}
		}

		pos = lineStart - 1
	}

	const mappedSelection = state.selection.map(tr.doc, tr.mapping)
	tr.setSelection(mappedSelection)

	if (tr.docChanged) {
		dispatch(tr)
	}
}
