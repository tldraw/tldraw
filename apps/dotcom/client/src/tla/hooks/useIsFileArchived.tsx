import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useIsFileArchived(fileId: string, workspaceId: string | null): boolean {
	const app = useMaybeApp()
	return useValue(
		'isArchived',
		() => !!(app && fileId && workspaceId && app.isArchived(fileId, workspaceId)),
		[app, fileId, workspaceId]
	)
}
