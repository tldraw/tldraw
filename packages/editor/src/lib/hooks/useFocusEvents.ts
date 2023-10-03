import { useLayoutEffect } from 'react'
import { useEditor } from './useEditor'

/** @internal */
export function useFocusEvents(autoFocus: boolean) {
	const editor = useEditor()
	useLayoutEffect(() => {
		const container = editor.getContainer()

		function handleFocus() {
			if (!editor.instanceState.isFocused) {
				editor.updateInstanceState({ isFocused: true })
			}
		}

		container.addEventListener('focus', handleFocus)

		if (autoFocus && !editor.instanceState.isFocused) {
			editor.updateInstanceState({ isFocused: true })
			editor.getContainer().focus()
		} else if (editor.instanceState.isFocused) {
			editor.updateInstanceState({ isFocused: false })
		}

		return () => {
			container.removeEventListener('focus', handleFocus)
		}
	}, [editor, autoFocus])
}
