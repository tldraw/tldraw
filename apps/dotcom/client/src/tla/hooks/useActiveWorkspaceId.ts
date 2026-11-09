import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from './useAppState'

/**
 * The active workspace ("group") is derived from the URL, not stored separately: the
 * workspace page's own id, else the file that's currently open, falling back to
 * the user's home workspace, whose default name is "My workspace" and can be renamed.
 *
 * A file can belong to a workspace the user is not a member of (e.g. a guest
 * visiting a shared file); only memberships count as active.
 */
export function useActiveWorkspaceId() {
	const app = useApp()
	const { fileSlug, workspaceId } = useParams<{ fileSlug: string; workspaceId: string }>()
	return useValue(
		'activeWorkspaceId',
		() => {
			if (workspaceId && app.getWorkspaceMembership(workspaceId)) return workspaceId
			if (fileSlug) {
				const file = app.getFile(fileSlug)
				if (file?.owningGroupId && app.getWorkspaceMembership(file.owningGroupId)) {
					return file.owningGroupId
				}
			}
			return app.getHomeWorkspaceId()
		},
		[app, fileSlug, workspaceId]
	)
}
