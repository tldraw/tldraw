import {
	Editor,
	TLShapeId,
	TLTextTriggerHook,
	TLUnknownShape,
	Vec,
	getPointerInfo,
	noop,
	stopEventPropagation,
	tlenv,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef } from 'react'
import { INDENT, TextHelpers } from './TextHelpers'

const DefaultTextTriggerHook = () => ({ onKeyDown: async () => false })

/** @public */
export function useEditableText(
	shapeId: TLShapeId,
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
			{ id: shapeId, type, props: { text } },
		])
	})
	const isEditing = useValue('isEditing', () => editor.getEditingShapeId() === shapeId, [editor])
	const isEditingAnything = useValue('isEditingAnything', () => !!editor.getEditingShapeId(), [
		editor,
	])

	useEffect(() => {
		function selectAllIfEditing(event: { shapeId: TLShapeId }) {
			if (event.shapeId === shapeId) {
				rInput.current?.select()
			}
		}

		editor.on('select-all-text', selectAllIfEditing)
		return () => {
			editor.off('select-all-text', selectAllIfEditing)
		}
	}, [editor, shapeId, isEditing])

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
		async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (editor.getEditingShapeId() !== shapeId) return

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
		[editor, shapeId, onCustomKeyDown]
	)

	// When the text changes, update the text value.
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			if (editor.getEditingShapeId() !== shapeId) return

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
				id: shapeId,
				type,
				props: { text },
			})
		},
		[editor, shapeId, type]
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
				shape: editor.getShape(shapeId)!,
			})

			stopEventPropagation(e) // we need to prevent blurring the input
		},
		[editor, shapeId]
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
