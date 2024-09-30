import {
	TLShapeId,
	TLUnknownShape,
	getPointerInfo,
	noop,
	stopEventPropagation,
	tlenv,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef } from 'react'
import { INDENT, TextHelpers } from './TextHelpers'

/** @public */
export function useEditableText(id: TLShapeId, type: string, text: string) {
	const editor = useEditor()
	const rInput = useRef<HTMLTextAreaElement>(null)
	const isEditing = useValue('isEditing', () => editor.getEditingShapeId() === id, [editor])
	const isEditingAnything = useValue('isEditingAnything', () => !!editor.getEditingShapeId(), [
		editor,
	])

	useEffect(() => {
		function selectAllIfEditing({ shapeId }: { shapeId: TLShapeId }) {
			if (shapeId === id) {
				rInput.current?.select()
			}
		}

		editor.on('select-all-text', selectAllIfEditing)
		return () => {
			editor.off('select-all-text', selectAllIfEditing)
		}
	}, [editor, id, isEditing])

	useEffect(() => {
		if (!isEditing) return

		if (document.activeElement !== rInput.current) {
			rInput.current?.focus()
		}

		if (editor.getInstanceState().isCoarsePointer) {
			rInput.current?.select()
		}

		// XXX(mime): This fixes iOS not showing the cursor sometimes.
		// This "shakes" the cursor awake.
		if (tlenv.isSafari) {
			rInput.current?.blur()
			rInput.current?.focus()
		}
	}, [editor, isEditing])

	// When the user presses ctrl / meta enter, complete the editing state.
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (editor.getEditingShapeId() !== id) return

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
			}
		},
		[editor, id]
	)

	// When the text changes, update the text value.
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			if (editor.getEditingShapeId() !== id) return

			let text = TextHelpers.normalizeText(e.currentTarget.value)

			// ------- Bug fix ------------
			// Replace tabs with spaces when pasting
			const untabbedText = text.replace(/\t/g, INDENT)
			if (untabbedText !== text) {
				const selectionStart = e.currentTarget.selectionStart
				e.currentTarget.value = untabbedText
				e.currentTarget.selectionStart = selectionStart + (untabbedText.length - text.length)
				e.currentTarget.selectionEnd = selectionStart + (untabbedText.length - text.length)
				text = untabbedText
			}
			// ----------------------------

			editor.updateShape<TLUnknownShape & { props: { text: string } }>({
				id,
				type,
				props: { text },
			})
		},
		[editor, id, type]
	)

	const handleInputPointerDown = useCallback(
		(e: React.PointerEvent) => {
			// N.B. We used to only do this only when isEditing to help
			// prevent an issue where you could drag a selected shape
			// behind another shape. That is addressed now by the CSS logic
			// looking at data-isselectinganything.
			//
			// We still need to follow this logic even if not isEditing
			// because otherwise there is some flakiness in selection.
			// When selecting text, it would sometimes select some text
			// partially if we didn't dispatch/stop below.

			editor.dispatch({
				...getPointerInfo(e),
				type: 'pointer',
				name: 'pointer_down',
				target: 'shape',
				shape: editor.getShape(id)!,
			})

			stopEventPropagation(e) // we need to prevent blurring the input
		},
		[editor, id]
	)

	return {
		rInput,
		handleFocus: noop,
		handleBlur: noop,
		handleKeyDown,
		handleChange,
		handleInputPointerDown,
		handleDoubleClick: stopEventPropagation,
		isEmpty: text.trim().length === 0,
		isEditing,
		isEditingAnything,
	}
}
