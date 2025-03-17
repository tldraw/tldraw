import { EditorView } from '@tiptap/pm/view'
import { EditorEvents, EditorProvider, JSONContent, type Editor as TTEditor } from '@tiptap/react'
import {
	Editor,
	TLRichText,
	TLShapeId,
	preventDefault,
	stopEventPropagation,
	useEditor,
	useUniqueSafeId,
} from '@tldraw/editor'
import React, { useCallback, useLayoutEffect, useRef } from 'react'

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
		handleBlur,
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
	const rCreateInfo = useRef({
		selectAll: false,
		caretPosition: null as { x: number; y: number } | null,
		time: Date.now(),
	})

	const rTextEditor = useRef<TTEditor | null>(null)

	// The order of events is:
	// - editor begins editing any shape
	// - we set listeners for select all / place caret events
	// - if the user is editing this shape, this component is rendered
	// - editor emits the select all event / place caret event
	// - the text editor is created
	const handleCreate = useCallback(
		(props: EditorEvents['create']) => {
			// If we're not still editing the original shape, then don't do anything.
			if (editor.getEditingShapeId() !== shapeId) return

			const textEditor = props.editor
			editor.setRichTextEditor(textEditor)
			rTextEditor.current = textEditor

			const { selectAll, caretPosition } = rCreateInfo.current

			if (selectAll) {
				// Select all of the text
				textEditor.chain().focus().selectAll().run()
				return
			}

			if (caretPosition) {
				// Set the initial caret screen position
				const pos = textEditor.view.posAtCoords({
					left: caretPosition.x,
					top: caretPosition.y,
				})?.pos

				if (pos) {
					// Focus to that position.
					textEditor.chain().focus().setTextSelection(pos).run()
				} else {
					// If no position, default to select all.
					textEditor.chain().focus().selectAll().run()
				}
				return
			}

			// XXX: When creating a brand new shape and double-clicking into it quickly to edit it,
			// there's some kind of race condition happening where the editor doesn't focus properly.
			editor.timers.setTimeout(() => textEditor.commands.focus('end'), 100)
		},
		[editor, shapeId]
	)

	useLayoutEffect(() => {
		function selectAllIfEditing(event: { shapeId: TLShapeId }) {
			if (event.shapeId === editor.getEditingShapeId()) {
				rCreateInfo.current = { ...rCreateInfo.current, selectAll: true }
			}
		}

		function placeCaret(event: { shapeId: TLShapeId; point: { x: number; y: number } }) {
			if (event.shapeId === editor.getEditingShapeId()) {
				rCreateInfo.current = { ...rCreateInfo.current, caretPosition: event.point }
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

	// We had to disable this. This was causing keyboard issues in iOS.
	// One way to have it exhibit the issue was to have the shape selected,
	// then double-click in the area outside the label bounds.
	// const handleBlur = useCallback(() => {
	// 	// On iOS Safari, the blur event is fired when the virtual keyboard is closed.
	// 	// If we're showing this toolbar on iOS, then we need to close the editor when
	// 	// this happens. However, the blur event is sometimes fired immediately as the
	// 	// component renders, so we want to wait a short amount of time before this
	// 	// logic kicks in.
	// 	if (tlenv.isSafari && tlenv.isIos) {
	// 		if (editor.getEditingShapeId() === shapeId) {
	// 			// There's a chance we get some immediate blurs during render
	// 			if (Date.now() - rCreateInfo.current.time > 500) {
	// 				// The user either blurred or just pressed "done"
	// 				editor.setEditingShape(null)
	// 			}
	// 		}
	// 	}
	// 	_handleBlur?.()
	// }, [editor, _handleBlur, shapeId])

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
			// N.B. When PointerStateExtension was introduced, this was moved there.
			// However, that caused selecting over list items to break.
			// The handleDOMEvents in TipTap don't seem to support the pointerDownCapture event.
			onPointerDownCapture={stopEventPropagation}
			// This onTouchEnd is important for Android to be able to change selection on text.
			onTouchEnd={stopEventPropagation}
			// On FF, there's a behavior where dragging a selection will grab that selection into
			// the drag event. However, once the drag is over, and you select away from the textarea,
			// starting a drag over the textarea will restart a selection drag instead of a shape drag.
			// This prevents that default behavior in FF.
			onDragStart={preventDefault}
		>
			<div className="tl-rich-text">
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
					coreExtensionOptions={{
						clipboardTextSerializer: {
							blockSeparator: '\n',
						},
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

	const textEditor = editor.getRichTextEditor()
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
