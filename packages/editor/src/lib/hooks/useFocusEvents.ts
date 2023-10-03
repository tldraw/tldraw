import { useLayoutEffect } from 'react'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

/** @internal */
export function useFocusEvents(autoFocus: boolean) {
	const editor = useEditor()
	const container = useContainer()
	useLayoutEffect(() => {
		function handleFocus() {
			if (!editor.instanceState.isFocused) {
				editor.updateInstanceState({ isFocused: true })
			}
		}

		container.addEventListener('focus', handleFocus)
		container.addEventListener('pointerdown', handleFocus)

		if (autoFocus && !editor.instanceState.isFocused) {
			editor.updateInstanceState({ isFocused: true })
			container.focus()
		} else if (editor.instanceState.isFocused) {
			editor.updateInstanceState({ isFocused: false })
		}

		return () => {
			container.removeEventListener('focus', handleFocus)
			container.removeEventListener('pointerdown', handleFocus)
		}
	}, [editor, container, autoFocus])
}
