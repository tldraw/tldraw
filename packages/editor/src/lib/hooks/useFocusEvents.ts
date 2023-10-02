import { useLayoutEffect } from 'react'
import { useEditor } from './useEditor'

/** @internal */
export function useFocusEvents(autoFocus: boolean) {
	const editor = useEditor()
	useLayoutEffect(() => {
		if (autoFocus) {
			editor.updateInstanceState({ isFocused: true })
			editor.getContainer().focus()
		} else {
			editor.updateInstanceState({ isFocused: false })
		}
	}, [editor, autoFocus])
}
