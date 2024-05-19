import {
	Editor,
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
		async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (editor.getEditingShapeId() !== id) return

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
		[editor, id, onCustomKeyDown]
	)

	// When the text changes, update the text value.
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			if (editor.getEditingShapeId() !== id) return

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

function noop() {
	return
}
