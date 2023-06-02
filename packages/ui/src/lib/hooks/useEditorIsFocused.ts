import { useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useEditorIsFocused() {
	const app = useEditor()
	return useValue('app.isFocused', () => app.isFocused, [app])
}
