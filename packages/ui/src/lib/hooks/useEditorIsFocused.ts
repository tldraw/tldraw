import { useApp } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useEditorIsFocused() {
	const app = useApp()
	return useValue('app.isFocused', () => app.isFocused, [app])
}
