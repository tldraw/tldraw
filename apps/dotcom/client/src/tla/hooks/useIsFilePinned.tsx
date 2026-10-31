import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useIsFilePinned(fileId: string, workspaceId: string | null): boolean {
	const app = useMaybeApp()
	return useValue(
		'isPinned',
		() => !!(app && fileId && workspaceId && app.isPinned(fileId, workspaceId)),
		[app, fileId, workspaceId]
	)
}
