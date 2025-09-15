import {
	Editor,
	TLRichText,
	TLShapeId,
	TLUnknownShape,
	getPointerInfo,
	isAccelKey,
	noop,
	preventDefault,
	stopEventPropagation,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useEffect, useRef } from 'react'
import { isEmptyRichText } from '../../utils/text/richText'

/** @public */
export function useEditableRichText(shapeId: TLShapeId, type: string, richText?: TLRichText) {
	const commonUseEditableTextHandlers = useEditableTextCommon(shapeId)
	const isEditing = commonUseEditableTextHandlers.isEditing
	const editor = useEditor()
	const rInput = useRef<HTMLDivElement>(null)
	const isEmpty = richText && isEmptyRichText(richText)

	useEffect(() => {
		if (!isEditing) return

		// N.B. In Development mode you need to ensure you're testing this without StrictMode on.
		// Otherwise it's not gonna work as expected on iOS.
		const contentEditable = rInput.current?.querySelector('[contenteditable]')
		if (contentEditable && document.activeElement !== rInput.current) {
			// This is a crucial difference with useEditablePlainText, that we need to select the
			// child contentEditable <div> not rInput.current directly.
			// Specifically, this is to ensure iOS works. Otherwise, we could just use rInput.current.
			;(contentEditable as HTMLElement).focus()
		}
	}, [editor, isEditing])

	// When the user presses ctrl / meta enter, complete the editing state.
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (editor.getEditingShapeId() !== shapeId) return
			if (e.key === 'Enter' && isAccelKey(e)) editor.complete()
		},
		[editor, shapeId]
	)

	// When the text changes, update the text value.
	const handleChange = useCallback(
		({ richText }: { richText: TLRichText }) => {
			if (editor.getEditingShapeId() !== shapeId) return

			editor.updateShape<TLUnknownShape & { props: { richText: TLRichText } }>({
				id: shapeId,
				type,
				props: { richText },
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
		handleDoubleClick: stopEventPropagation,
		handlePaste,
		isEditing,
		isReadyForEditing,
	}
}
