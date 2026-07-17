import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { setInSessionStorage } from 'tldraw'
import { routes } from '../../routeDefs'
import { WORKSPACE_INVITE_QUERY_PARAM } from '../components/WorkspaceInviteHandler'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'

export function Component() {
	const { token } = useParams<{ token: string }>()

	// Store the token once per token, not once per render: a render-phase write
	// can re-create the token after WorkspaceInviteHandler has consumed it (the
	// handler runs on every navigation commit while this route is unmounting),
	// which double-fetches the invite and stacks two join dialogs.
	useEffect(() => {
		if (token) {
			setInSessionStorage(SESSION_STORAGE_KEYS.WORKSPACE_INVITE_TOKEN, token)
		}
	}, [token])

	// The invite route resolves to the normal root experience: the anonymous
	// editor when signed out, your most recent file when signed in. The
	// root-level WorkspaceInviteHandler picks the token up from session
	// storage and shows the relevant invite dialog on top. The query param
	// marks this arrival as coming from an invite link.
	return <Navigate to={`${routes.tlaRoot()}?${WORKSPACE_INVITE_QUERY_PARAM}=true`} replace />
}
