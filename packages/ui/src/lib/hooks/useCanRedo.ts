import { useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

/** @public */
export function useCanRedo() {
	const app = useEditor()
	return useValue('useCanRedo', () => app.canRedo, [app])
}
