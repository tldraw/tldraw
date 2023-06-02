import { useApp } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useAppIsFocused() {
	const app = useApp()
	return useValue('app.isFocused', () => app.isFocused, [app])
}
