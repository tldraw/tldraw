import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TldrawAppWorkspace } from '../utils/tla/schema/TldrawAppWorkspace'

export function useWorkspace() {
	const app = useApp()
	return useValue(
		'workspace',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app.get<TldrawAppWorkspace>(auth.workspaceId)
		},
		[app]
	)
}
