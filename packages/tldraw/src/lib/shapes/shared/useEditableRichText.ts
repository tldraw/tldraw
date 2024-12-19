import { TLRichText, TLShapeId, TLUnknownShape, useEditor } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'
import { renderPlaintextFromRichText } from '../../utils/text/richText'
import { useEditableTextCommon } from './useEditablePlainText'

/** @public */
export function useEditableRichText(shapeId: TLShapeId, type: string, richText?: TLRichText) {
	const commonUseEditableTextHandlers = useEditableTextCommon(shapeId)
	const isEditing = commonUseEditableTextHandlers.isEditing
	const editor = useEditor()
	const rInput = useRef<HTMLDivElement>(null)
	const isEmpty = richText ? renderPlaintextFromRichText(editor, richText).length === 0 : true

	useEffect(() => {
		if (!isEditing) return

		if (document.activeElement !== rInput.current) {
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