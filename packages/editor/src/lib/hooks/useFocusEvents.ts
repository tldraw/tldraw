import { useLayoutEffect } from 'react'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

/** @internal */
export function useFocusEvents(autoFocus: boolean) {
	const editor = useEditor()
	const container = useContainer()
	useLayoutEffect(() => {
		if (autoFocus) {
			// When autoFocus is true, update the editor state to be focused
			// unless it's already focused
			if (!editor.instanceState.isFocused) {
				editor.updateInstanceState({ isFocused: true })
				container.focus()
			}
		} else {
			// When autoFocus is false, update the editor state to be not focused
			// unless it's already not focused
			if (editor.instanceState.isFocused) {
				editor.updateInstanceState({ isFocused: false })
			}
		}
	}, [editor, container, autoFocus])
}
