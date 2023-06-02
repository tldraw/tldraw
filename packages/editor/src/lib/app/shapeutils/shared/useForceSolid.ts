import { useValue } from 'signia-react'
import { useEditor } from '../../../hooks/useEditor'

export function useForceSolid() {
	const app = useEditor()
	return useValue('zoom', () => app.zoomLevel < 0.35, [app])
}
