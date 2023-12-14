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
			if (!editor.getInstanceState().isFocused) {
				editor.updateInstanceState({ isFocused: true })
			}

			// Note: Focus is also handled by the side effect manager in tldraw.
			// Importantly, if a user manually sets isFocused to true (or if it
			// changes for any reason from false to true), the side effect manager
			// in tldraw will also take care of the focus. However, it may be that
			// on first mount the editor already has isFocused: true in the model,
			// so we also need to focus it here just to be sure.
			editor.getContainer().focus()
		} else {
			// When autoFocus is false, update the editor state to be not focused
			// unless it's already not focused
			if (editor.getInstanceState().isFocused) {
				editor.updateInstanceState({ isFocused: false })
			}
		}
	}, [editor, container, autoFocus])
}
