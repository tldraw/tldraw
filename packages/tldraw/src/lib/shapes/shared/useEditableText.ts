import {
	TLShapeId,
	TLUnknownShape,
	getPointerInfo,
	preventDefault,
	stopEventPropagation,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef } from 'react'
import { INDENT, TextHelpers } from './TextHelpers'

/** @public */
export function useEditableText(
	id: TLShapeId,
	type: string,
	text: string,
	opts = { disableTab: false } as { disableTab: boolean }
) {
	const editor = useEditor()

	const rInput = useRef<HTMLTextAreaElement>(null)

	const isEditing = useValue(
		'isEditing',
		() => {
			return editor.getEditingShapeId() === id
		},
		[editor]
	)

	const isEditingAnything = useValue(
		'isEditingAnything',
		() => {
			return editor.getEditingShapeId() !== null
		},
		[editor]
	)

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

	const rSelectionRanges = useRef<Range[] | null>()

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
				case 'Tab': {
					if (!opts.disableTab) {
						preventDefault(e)
						if (e.shiftKey) {
							TextHelpers.unindent(e.currentTarget)
						} else {
							TextHelpers.indent(e.currentTarget)
						}
					}
					break
				}
			}
		},
		[editor, id, opts.disableTab]
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
			// This is important that we only dispatch when editing.
			// Otherwise, you can get into a state where you're editing
			// able to drag a selected shape behind another shape.
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
		handleFocus: noop,
		handleBlur,
		handleKeyDown,
		handleChange,
		handleInputPointerDown,
		handleDoubleClick,
		isEmpty: text.trim().length === 0,
		isEditing,
		isEditingAnything,
	}
}

function noop() {
	return
}
