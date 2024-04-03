/* eslint-disable no-inner-declarations */
import {
	Editor,
	TLShape,
	TLShapeId,
	TLTextTriggerHook,
	TLUnknownShape,
	Vec,
	getPointerInfo,
	stopEventPropagation,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef } from 'react'
import { INDENT, TextHelpers } from './TextHelpers'

const DefaultTextTriggerHook = () => ({ onKeyDown: async () => false })

/** @public */
export function useEditableText(
	id: TLShapeId,
	type: string,
	text: string,
	options: {
		useTextTriggerCharacter?: TLTextTriggerHook
	}
) {
	const editor = useEditor()
	const rInput = useRef<HTMLTextAreaElement>(null)
	const useTextTriggerCharacter = options.useTextTriggerCharacter || DefaultTextTriggerHook
	const { onKeyDown: onCustomKeyDown } = useTextTriggerCharacter(rInput.current, (text: string) => {
		editor.updateShapes<TLUnknownShape & { props: { text: string } }>([
			{ id, type, props: { text } },
		])
	})
	const rSkipSelectOnFocus = useRef(false)
	const rSelectionRanges = useRef<Range[] | null>()

	const isEditing = useValue('isEditing', () => editor.getEditingShapeId() === id, [editor, id])

	// If the shape is editing but the input element not focused, focus the element
	useEffect(() => {
		const elm = rInput.current
		if (elm && isEditing && document.activeElement !== elm) {
			elm.focus()
		}
	}, [isEditing])

	// When the label receives focus, set the value to the most  recent text value and select all of the text
	const handleFocus = useCallback(() => {
		// Store and turn off the skipSelectOnFocus flag
		const skipSelect = rSkipSelectOnFocus.current
		rSkipSelectOnFocus.current = false

		// On the next frame, if we're not skipping select AND we have text in the element, then focus the text
		requestAnimationFrame(() => {
			const elm = rInput.current
			if (!elm) return

			const shape = editor.getShape<TLShape & { props: { text: string } }>(id)

			if (shape) {
				elm.value = shape.props.text
				if (elm.value.length && !skipSelect) {
					elm.select()
				}
			}
		})
	}, [editor, id])

	// When the label blurs, deselect all of the text and complete.
	// This makes it so that the canvas does not have to be focused
	// in order to exit the editing state and complete the editing state
	const handleBlur = useCallback(() => {
		const ranges = rSelectionRanges.current

		requestAnimationFrame(() => {
			const elm = rInput.current
			const editingShapeId = editor.getEditingShapeId()
			// Did we move to a different shape?
			if (elm && editingShapeId) {
				// important! these ^v are two different things
				// is that shape OUR shape?
				if (editingShapeId === id) {
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
		async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (!isEditing) return

			const inputEl = e.target as HTMLTextAreaElement
			// Here we possibly pass control to a custom text handling component passed in by the user, if present.
			if (inputEl && inputEl.previousSibling) {
				const coords = getCaretPosition(editor, inputEl, inputEl.previousSibling)
				const isHandledByCustomLogic = await onCustomKeyDown(e, coords)
				if (isHandledByCustomLogic) {
					return
				}
			}

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
			}
		},
		[editor, isEditing, onCustomKeyDown]
	)

	// When the text changes, update the text value.
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			if (!isEditing) return

			let text = TextHelpers.normalizeTextForDom(e.currentTarget.value)

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

	const handleDoubleClick = stopEventPropagation

	return {
		rInput,
		isEditing,
		handleFocus,
		handleBlur,
		handleKeyDown,
		handleChange,
		handleInputPointerDown,
		handleDoubleClick,
		isEmpty,
	}
}

function getCaretPosition(editor: Editor, inputEl: HTMLTextAreaElement, measureEl: ChildNode) {
	// There should only be one child - the text node.
	const measureNode = measureEl.childNodes[0]

	const range = document.createRange()
	range.setStart(measureNode, inputEl.selectionStart)
	range.setEnd(measureNode, inputEl.selectionEnd)
	const rangeBounds = range.getBoundingClientRect()

	const cursorScreenPos = new Vec(rangeBounds.left + rangeBounds.width / 2, rangeBounds.bottom)
	const cursorViewportPos = Vec.Sub(cursorScreenPos, editor.getViewportScreenBounds())

	return { top: cursorViewportPos.y, left: cursorViewportPos.x }
}
