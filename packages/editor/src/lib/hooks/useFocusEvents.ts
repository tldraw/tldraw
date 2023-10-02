import { useLayoutEffect } from 'react'
import { useEditor } from './useEditor'

/** @internal */
export function useFocusEvents(autoFocus: boolean) {
	const editor = useEditor()
	useLayoutEffect(() => {
		if (autoFocus && !editor.instanceState.isFocused) {
			editor.updateInstanceState({ isFocused: true })
			editor.getContainer().focus()
		} else if (editor.instanceState.isFocused) {
			editor.updateInstanceState({ isFocused: false })
		}
	}, [editor, autoFocus])
}
