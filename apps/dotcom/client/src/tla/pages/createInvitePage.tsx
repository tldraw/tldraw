import { Navigate, useParams } from 'react-router-dom'
import { setInSessionStorage } from 'tldraw'
import { routes } from '../../routeDefs'
import { WORKSPACE_INVITE_QUERY_PARAM } from '../components/WorkspaceInviteHandler'

export function createInvitePage(sessionStorageKey: string) {
	return function InvitePage() {
		const { token } = useParams<{ token: string }>()

		if (token) {
			setInSessionStorage(sessionStorageKey, token)
		}

		// The invite route resolves to the normal root experience: the anonymous
		// editor when signed out, your most recent file when signed in. The
		// root-level WorkspaceInviteHandler picks the token up from session
		// storage and shows the relevant invite dialog on top. The query param
		// marks this arrival as coming from an invite link.
		return <Navigate to={`${routes.tlaRoot()}?${WORKSPACE_INVITE_QUERY_PARAM}=true`} replace />
	}
}
