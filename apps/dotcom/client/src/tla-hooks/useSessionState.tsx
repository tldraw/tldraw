import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'

export function useSessionState() {
	const app = useApp()
	return useValue(
		'session state',
		() => {
			return app.getSessionState()
		},
		[app]
	)
}
