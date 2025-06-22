import { TLRichText, TLShapeId, TLUnknownShape, isAccelKey, useEditor } from '@tldraw/editor'
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
