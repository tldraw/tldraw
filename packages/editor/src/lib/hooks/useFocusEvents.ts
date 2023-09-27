import { useLayoutEffect } from 'react'
import { useEditor } from './useEditor'

/** @internal */
export function useFocusEvents(autoFocus: boolean) {
	const editor = useEditor()
	useLayoutEffect(() => {
		if (autoFocus) {
			editor.getContainer().focus()
		}
	}, [editor, autoFocus])
}
