import { TLRichText, TLShapeId, TLUnknownShape, preventDefault, useEditor } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'
import { isEmptyRichText } from '../../utils/text/richText'
import { useEditableTextCommon } from './useEditablePlainText'

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

	const handlePaste = useCallback(
		(e: ClipboardEvent | React.ClipboardEvent<HTMLTextAreaElement>) => {
			if (editor.getEditingShapeId() !== shapeId) return
			if (e.clipboardData) {
				// find html in the clipboard and look for the tldraw data
				const html = e.clipboardData.getData('text/html')
				if (html) {
					const isTldrawShapeData = html.includes('<div data-tldraw')
					if (isTldrawShapeData) {
						preventDefault(e)
					}
				}
			}
		},
		[editor, shapeId]
	)

	return {
		rInput,
		handleKeyDown,
		handleChange,
		handlePaste,
		isEmpty,
		...commonUseEditableTextHandlers,
	}
}
