/* eslint-disable no-inner-declarations */
import { useValue } from '@tldraw/state'
import { TLShape, TLUnknownShape } from '@tldraw/tlschema'
import React, { useCallback, useEffect, useRef } from 'react'
import { useEditor } from '../../../hooks/useEditor'
import { preventDefault, stopEventPropagation } from '../../../utils/dom'
import { INDENT, TextHelpers } from '../text/TextHelpers'

export function useEditableText<T extends Extract<TLShape, { props: { text: string } }>>(
	id: T['id'],
	type: T['type'],
	text: string
) {
	const editor = useEditor()

	const rInput = useRef<HTMLTextAreaElement>(null)

	const isEditing = useValue('isEditing', () => editor.pageState.editingId === id, [editor, id])

	const rSkipSelectOnFocus = useRef(false)
	const rSelectionRanges = useRef<Range[] | null>()

	const isEditableFromHover = useValue(
		'is editable hovering',
		() => {
			if (type === 'text' && editor.isIn('text') && editor.hoveredId === id) {
				return true
			}

			if (editor.isIn('select.editing_shape')) {
				const { editingShape } = editor
				if (!editingShape) return false
				return (
					// The shape must be hovered
					editor.hoveredId === id &&
					// the editing shape must be the same type as this shape
					editingShape.type === type &&
					// and this shape must be capable of being editing in its current form
					editor.getShapeUtil(editingShape).canEdit(editingShape)
				)
			}

			return false
		},
		[type, id]
	)

	// When the label receives focus, set the value to the most
	// recent text value and select all of the text
	const handleFocus = useCallback(() => {
		if (isEditableFromHover) return

		requestAnimationFrame(() => {
			const elm = rInput.current

			if (!elm) return

			const shape = editor.getShapeById<TLShape & { props: { text: string } }>(id)
			if (shape) {
				elm.value = shape.props.text
				if (elm.value.length && !rSkipSelectOnFocus.current) {
					elm.select()
				}

				rSkipSelectOnFocus.current = false
			}
		})
	}, [editor, id, isEditableFromHover])

	// When the label blurs, deselect all of the text and complete.
	// This makes it so that the canvas does not have to be focused
	// in order to exit the editing state and complete the editing state
	const handleBlur = useCallback(() => {
		const ranges = rSelectionRanges.current

		requestAnimationFrame(() => {
			const elm = rInput.current
			if (editor.isIn('select.editing_shape') && elm) {
				if (ranges) {
					if (!ranges.length) {
						// If we don't have any ranges, restore selection
						// and select all of the text
						elm.focus()
					} else {
						// Otherwise, skip the select-all-on-focus behavior
						// and restore the selection
						rSkipSelectOnFocus.current = true
						elm.focus()
						const selection = window.getSelection()
						if (selection) {
							ranges.forEach((range) => selection.addRange(range))
						}
					}
				} else {
					elm.focus()
				}
			} else {
				window.getSelection()?.removeAllRanges()
				editor.complete()
			}
		})
	}, [editor])

	// When the user presses ctrl / meta enter, complete the editing state.
	// When the user presses tab, indent or unindent the text.
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.ctrlKey || e.metaKey) stopEventPropagation(e)

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
				case 'Tab': {
					preventDefault(e)
					if (e.shiftKey) {
						TextHelpers.unindent(e.currentTarget)
					} else {
						TextHelpers.indent(e.currentTarget)
					}
					break
				}
			}
		},
		[editor]
	)

	// When the text changes, update the text value.
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
		[editor, id, type]
	)

	const isEmpty = text.trim().length === 0

	useEffect(() => {
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
	})

	return {
		rInput,
		isEditing,
		isEditableFromHover,
		handleFocus,
		handleBlur,
		handleKeyDown,
		handleChange,
		isEmpty,
	}
}
