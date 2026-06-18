import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useIsFilePinned(fileId: string, workspaceId: string): boolean {
	const app = useMaybeApp()
	return useValue(
		'isPinned',
		() => {
			if (!fileId) return false
			if (!app) return false
			return app.isPinned(fileId, workspaceId)
		},
		[app, fileId, workspaceId]
	)
}
