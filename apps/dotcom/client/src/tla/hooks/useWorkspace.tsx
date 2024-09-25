import { useValue } from 'tldraw'
import { TldrawAppWorkspace } from '../utils/schema/TldrawAppWorkspace'
import { useApp } from './useAppState'

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
