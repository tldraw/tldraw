import {
	Editor,
	TLShapeId,
	TLUnknownShape,
	getPointerInfo,
	noop,
	preventDefault,
	tlenv,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef } from 'react'
import { TextHelpers } from './TextHelpers'

/** @public */
export function useEditablePlainText(shapeId: TLShapeId, type: string, text?: string) {
	const commonUseEditableTextHandlers = useEditableTextCommon(shapeId)
	const isEditing = commonUseEditableTextHandlers.isEditing
	const editor = useEditor()
	const rInput = useRef<HTMLTextAreaElement>(null)
	const isEmpty = (text || '').trim().length === 0

	useEffect(() => {
		function selectAllIfEditing(event: { shapeId: TLShapeId }) {
			if (event.shapeId === shapeId) {
				rInput.current?.select?.()
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

		// XXX(mime): This fixes iOS not showing the caret sometimes.
		// This "shakes" the caret awake.
		if (tlenv.isSafari) {
			rInput.current?.blur()
			rInput.current?.focus()
		}
	}, [editor, isEditing])

	// When the user presses ctrl / meta enter, complete the editing state.
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (editor.getEditingShapeId() !== shapeId) return

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
			}
		},
		[editor, shapeId]
	)

	// When the text changes, update the text value.
	const handleChange = useCallback(
		({ plaintext }: { plaintext: string }) => {
			if (editor.getEditingShapeId() !== shapeId) return

			const normalizedPlaintext = TextHelpers.normalizeText(plaintext || '')
			editor.updateShape<TLUnknownShape & { props: { text: string } }>({
				id: shapeId,
				type,
				props: { text: normalizedPlaintext },
			})
		},
		[editor, shapeId, type]
	)

	return {
		rInput,
		handleKeyDown,
		handleChange,
		isEmpty,
		...commonUseEditableTextHandlers,
	}
}

/** @internal */
export function useIsReadyForEditing(editor: Editor, shapeId: TLShapeId) {
	return useValue(
		'isReadyForEditing',
		() => {
			const editingShapeId = editor.getEditingShapeId()
			return (
				// something's being editing... and either it's this shape OR this shape is hovered
				editingShapeId !== null &&
				(editingShapeId === shapeId || editor.getHoveredShapeId() === shapeId)
			)
		},
		[editor, shapeId]
	)
}

/** @internal */
export function useEditableTextCommon(shapeId: TLShapeId) {
	const editor = useEditor()
	const isEditing = useValue('isEditing', () => editor.getEditingShapeId() === shapeId, [editor])
	const isReadyForEditing = useIsReadyForEditing(editor, shapeId)

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
				...getPointerInfo(editor, e),
				type: 'pointer',
				name: 'pointer_down',
				target: 'shape',
				shape: editor.getShape(shapeId)!,
			})

			e.stopPropagation() // we need to prevent blurring the input
		},
		[editor, shapeId]
	)

	const handlePaste = useCallback(
		(e: ClipboardEvent | React.ClipboardEvent<HTMLTextAreaElement>) => {
			if (editor.getEditingShapeId() !== shapeId) return
			if (e.clipboardData) {
				// find html in the clipboard and look for the tldraw data
				const html = e.clipboardData.getData('text/html')
				if (html) {
					if (html.includes('<div data-tldraw')) {
						preventDefault(e)
					}
				}
			}
		},
		[editor, shapeId]
	)

	return {
		handleFocus: noop,
		handleBlur: noop,
		handleInputPointerDown,
		handleDoubleClick: editor.markEventAsHandled,
		handlePaste,
		isEditing,
		isReadyForEditing,
	}
}
