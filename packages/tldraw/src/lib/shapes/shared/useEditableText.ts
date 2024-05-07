import {
	TLShapeId,
	TLUnknownShape,
	getPointerInfo,
	stopEventPropagation,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef } from 'react'
import { INDENT, TextHelpers } from './TextHelpers'

/** @public */
export function useEditableText(id: TLShapeId, type: string, text: string) {
	const editor = useEditor()
	const rInput = useRef<HTMLTextAreaElement>(null)
	const rSelectionRanges = useRef<Range[] | null>()
	const isEditing = useValue('isEditing', () => editor.getEditingShapeId() === id, [editor])
	const isEditingAnything = useValue('isEditingAnything', () => !!editor.getEditingShapeId(), [
		editor,
	])

	useEffect(() => {
		function selectAllIfEditing({ shapeId }: { shapeId: TLShapeId }) {
			// We wait a tick, because on iOS, the keyboard will not show if we focus immediately.
			requestAnimationFrame(() => {
				if (shapeId === id) {
					const elm = rInput.current
					if (elm) {
						if (document.activeElement !== elm) {
							elm.focus()
						}
						elm.select()
					}
				}
			})
		}

		editor.on('select-all-text', selectAllIfEditing)
		return () => {
			editor.off('select-all-text', selectAllIfEditing)
		}
	}, [editor, id])

	useEffect(() => {
		if (!isEditing) return

		const elm = rInput.current
		if (!elm) return

		// Focus if we're not already focused
		if (document.activeElement !== elm) {
			elm.focus()

			// On mobile etc, just select all the text when we start focusing
			if (editor.getInstanceState().isCoarsePointer) {
				elm.select()
			}
		} else {
			// This fixes iOS not showing the cursor sometimes. This "shakes" the cursor
			// awake.
			if (editor.environment.isSafari) {
				elm.blur()
				elm.focus()
			}
		}

		// When the selection changes, save the selection ranges
		function updateSelection() {
			const selection = window.getSelection?.()
			if (selection && selection.type !== 'None') {
				const ranges: Range[] = []
				for (let i = 0; i < selection.rangeCount; i++) {
					ranges.push(selection.getRangeAt?.(i))
				}
				rSelectionRanges.current = ranges
			}
		}

		document.addEventListener('selectionchange', updateSelection)
		return () => {
			document.removeEventListener('selectionchange', updateSelection)
		}
	}, [editor, isEditing])

	// 2. Restore the selection changes (and focus) if the element blurs
	// When the label blurs, deselect all of the text and complete.
	// This makes it so that the canvas does not have to be focused
	// in order to exit the editing state and complete the editing state
	const handleBlur = useCallback(() => {
		const ranges = rSelectionRanges.current

		requestAnimationFrame(() => {
			const elm = rInput.current
			const editingShapeId = editor.getEditingShapeId()

			// Did we move to a different shape?
			if (editingShapeId) {
				// important! these ^v are two different things
				// is that shape OUR shape?
				if (elm && editingShapeId === id) {
					elm.focus()

					if (ranges && ranges.length) {
						const selection = window.getSelection()
						if (selection) {
							ranges.forEach((range) => selection.addRange(range))
						}
					}
				}
			} else {
				window.getSelection()?.removeAllRanges()
			}
		})
	}, [editor, id])

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
		handleBlur,
		handleKeyDown,
		handleChange,
		handleInputPointerDown,
		handleDoubleClick: stopEventPropagation,
		isEmpty: text.trim().length === 0,
		isEditing,
		isEditingAnything,
	}
}

function noop() {
	return
}
