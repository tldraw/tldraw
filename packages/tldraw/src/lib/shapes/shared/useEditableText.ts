/* eslint-disable no-inner-declarations */

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

	const isEditingAnything = useValue(
		'isEditingAnything',
		() => editor.getEditingShapeId() !== null,
		[editor]
	)

	const isEditing = useValue('isEditing', () => editor.getEditingShapeId() === id, [editor, id])

	// If the shape is editing but the input element not focused, focus the element
	useEffect(() => {
		const elm = rInput.current
		if (elm && isEditing && document.activeElement !== elm) {
			elm.focus()
		}
	}, [isEditing])

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
					if (ranges) {
						if (!ranges.length) {
							// If we don't have any ranges, restore selection
							// and select all of the text
							elm.focus()
						} else {
							// Restore the selection
							elm.focus()
							const selection = window.getSelection()
							if (selection) {
								ranges.forEach((range) => selection.addRange(range))
							}
						}
					} else {
						elm.focus()
					}
				}
			} else {
				window.getSelection()?.removeAllRanges()
			}
		})
	}, [editor, id])

	// When the user presses ctrl / meta enter, complete the editing state.
	// When the user presses tab, indent or unindent the text.
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (!isEditing) return

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
			}
		},
		[editor, isEditing]
	)

	// When the text changes, update the text value.
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			if (!isEditing) return

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

			editor.updateShapes<TLUnknownShape & { props: { text: string } }>([
				{ id, type, props: { text } },
			])
		},
		[editor, id, type, isEditing]
	)

	const isEmpty = text.trim().length === 0

	useEffect(() => {
		if (!isEditing) return

		const elm = rInput.current
		if (elm) {
			function updateSelection() {
				const selection = window.getSelection?.()
				if (selection && selection.type !== 'None') {
					const ranges: Range[] = []

					if (selection) {
						for (let i = 0; i < selection.rangeCount; i++) {
							ranges.push(selection.getRangeAt?.(i))
						}
					}

					rSelectionRanges.current = ranges
				}
			}

			document.addEventListener('selectionchange', updateSelection)

			return () => {
				document.removeEventListener('selectionchange', updateSelection)
			}
		}
	}, [isEditing])

	const handleInputPointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (!isEditing) return

			editor.dispatch({
				...getPointerInfo(e),
				type: 'pointer',
				name: 'pointer_down',
				target: 'shape',
				shape: editor.getShape(id)!,
			})

			stopEventPropagation(e) // we need to prevent blurring the input
		},
		[editor, id, isEditing]
	)

	const handleDoubleClick = stopEventPropagation

	return {
		rInput,
		isEditing,
		handleFocus: noop,
		handleBlur,
		handleKeyDown,
		handleChange,
		handleInputPointerDown,
		handleDoubleClick,
		isEmpty,
		isEditingAnything,
	}
}

function noop() {
	return
}
