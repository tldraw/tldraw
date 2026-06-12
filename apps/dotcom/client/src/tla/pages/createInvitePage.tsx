import { Navigate, useParams } from 'react-router-dom'
import { setInSessionStorage } from 'tldraw'
import { routes } from '../../routeDefs'

export function createInvitePage(sessionStorageKey: string) {
	return function InvitePage() {
		const { token } = useParams<{ token: string }>()

		if (token) {
			setInSessionStorage(sessionStorageKey, token)
		}

		// The invite route resolves to the normal root experience: the anonymous
		// editor when signed out, your most recent file when signed in. The
		// root-level WorkspaceInviteHandler picks the token up from session
		// storage and shows the relevant invite dialog on top.
		return <Navigate to={routes.tlaRoot()} replace />
	}
}
