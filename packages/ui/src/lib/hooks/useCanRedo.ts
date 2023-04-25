import { useApp } from '@tldraw/editor'
import { useValue } from 'signia-react'

/** @public */
export function useCanRedo() {
	const app = useApp()
	return useValue('useCanRedo', () => app.canRedo, [app])
}
