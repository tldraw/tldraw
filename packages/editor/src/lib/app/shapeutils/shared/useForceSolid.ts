import { useValue } from 'signia-react'
import { useApp } from '../../../hooks/useEditor'

export function useForceSolid() {
	const app = useApp()
	return useValue('zoom', () => app.zoomLevel < 0.35, [app])
}
