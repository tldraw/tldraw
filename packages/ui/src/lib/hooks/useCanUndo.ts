import { useApp } from '@tldraw/editor'
import { useValue } from 'signia-react'

/** @public */
export function useCanUndo() {
	const app = useApp()
	return useValue('useCanUndo', () => app.canUndo, [app])
}
