import { useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

/** @public */
export function useCanUndo() {
	const app = useEditor()
	return useValue('useCanUndo', () => app.canUndo, [app])
}
