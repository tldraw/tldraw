import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

/** Null when the file has no group_file row in the workspace, so archiving it there would no-op. */
export function useFileArchiveState(
	fileId: string,
	workspaceId: string | null
): 'archived' | 'active' | null {
	const app = useMaybeApp()
	return useValue(
		'fileArchiveState',
		() => {
			if (!app || !fileId || !workspaceId) return null
			const groupFile = app.getWorkspaceGroupFile(fileId, workspaceId)
			if (!groupFile) return null
			return groupFile.archivedAt != null ? 'archived' : 'active'
		},
		[app, fileId, workspaceId]
	)
}
