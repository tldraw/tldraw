import { useLayoutEffect } from 'react'
import { useEditor } from './useEditor'

/** @internal */
export function useFocusEvents(autoFocus: boolean) {
	const editor = useEditor()
	useLayoutEffect(() => {
		if (autoFocus) {
			editor.updateInstanceState({ isFocused: true })
		} else {
			editor.updateInstanceState({ isFocused: false })
		}
	}, [editor, autoFocus])
}
