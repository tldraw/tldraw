/* eslint-disable no-inner-declarations */

import {
	TLShape,
	TLUnknownShape,
	getPointerInfo,
	preventDefault,
	stopEventPropagation,
	transact,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef } from 'react'
import { INDENT, TextHelpers } from './TextHelpers'

export function useEditableText<T extends Extract<TLShape, { props: { text: string } }>>(
	id: T['id'],
	type: T['type'],
	text: string
) {
	const editor = useEditor()

	const rInput = useRef<HTMLTextAreaElement>(null)

	const isEditing = useValue('isEditing', () => editor.currentPageState.editingShapeId === id, [
		editor,
		id,
	])

	const rSkipSelectOnFocus = useRef(false)
	const rSelectionRanges = useRef<Range[] | null>()

	const isEditableFromHover = useValue(
		'is editable hovering',
		() => {
			const { hoveredShapeId, editingShape } = editor
			if (type === 'text' && editor.isIn('text') && hoveredShapeId === id) {
				return true
			}

			if (editingShape) {
				return (
					// We must be hovering over this shape and not editing it
					hoveredShapeId === id &&
					editingShape.id !== id &&
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
		// We only want to do the select all thing if the shape
		// was the first shape to become editing. Switching from
		// one editing shape to another should not select all.
		if (isEditableFromHover) return

		requestAnimationFrame(() => {
			const elm = rInput.current
			if (!elm) return

			const shape = editor.getShape<TLShape & { props: { text: string } }>(id)
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
			// Did we move to a different shape?
			if (elm && editor.editingShapeId) {
				// important! these ^v are two different things
				// is that shape OUR shape?
				if (editor.editingShapeId === id) {
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
				}
			} else {
				window.getSelection()?.removeAllRanges()
				editor.complete()
			}
		})
	}, [editor, id])

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
	}, [])

	const handleInputPointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (isEditableFromHover) {
				transact(() => {
					editor.setEditingShape(id)
					editor.setHoveredShape(id)
					editor.setSelectedShapes([id])
				})
			} else {
				editor.dispatch({
					...getPointerInfo(e),
					type: 'pointer',
					name: 'pointer_down',
					target: 'shape',
					shape: editor.getShape(id)!,
				})
			}

			stopEventPropagation(e)
		},
		[editor, isEditableFromHover, id]
	)

	useEffect(() => {
		const elm = rInput.current
		if (elm && isEditing && document.activeElement !== elm) {
			elm.focus()
		}
	}, [isEditing])

	const handleDoubleClick = stopEventPropagation

	return {
		rInput,
		isEditing,
		isEditableFromHover,
		handleFocus,
		handleBlur,
		handleKeyDown,
		handleChange,
		handleInputPointerDown,
		handleDoubleClick,
		isEmpty,
	}
}
