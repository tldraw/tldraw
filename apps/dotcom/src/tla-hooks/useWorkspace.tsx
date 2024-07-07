import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TldrawAppWorkspace } from '../utils/tla/schema/TldrawAppWorkspace'

export function useWorkspace() {
	const app = useApp()
	return useValue(
		'workspace',
		() => {
			const session = app.getSession()
			if (!session) return null
			return app.get<TldrawAppWorkspace>(session.workspaceId)
		},
		[app]
	)
}
