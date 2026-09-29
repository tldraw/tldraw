import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { getActiveWorkspaceId } from '../../utils/analyticsWorkspace'
import { useApp } from './useAppState'

/**
 * The active workspace ("group") is derived from the file that's currently open,
 * not stored separately. We resolve it from the file in the URL and fall back to
 * the user's home workspace, whose default name is "My workspace" and can be renamed.
 *
 * A file can belong to a workspace the user is not a member of (e.g. a guest
 * visiting a shared file); only memberships count as active.
 */
export function useActiveWorkspaceId() {
	const app = useApp()
	const { fileSlug } = useParams<{ fileSlug: string }>()
	return useValue('activeWorkspaceId', () => getActiveWorkspaceId(app, fileSlug), [app, fileSlug])
}
