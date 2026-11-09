import { Navigate, useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { routes } from '../../routeDefs'
import { TlaWorkspaceHome } from '../components/TlaWorkspaceHome/TlaWorkspaceHome'
import { useApp } from '../hooks/useAppState'
import { useIsUiV3 } from '../hooks/useIsUiV3'
import { TlaWorkspaceLayout } from '../layouts/TlaWorkspaceLayout/TlaWorkspaceLayout'

export function Component() {
	const { workspaceId } = useParams<{ workspaceId: string }>()
	const app = useApp()
	const isUiV3 = useIsUiV3()
	const isMember = useValue(
		'is workspace member',
		() => !!workspaceId && !!app.getWorkspaceMembership(workspaceId),
		[app, workspaceId]
	)

	// The route exists for everyone; without the flag the root page picks a file as before.
	if (!isUiV3) return <Navigate to={routes.tlaRoot()} replace />
	if (!workspaceId || !isMember) {
		return <Navigate to={routes.tlaWorkspace(app.getHomeWorkspaceId())} replace />
	}

	return (
		<TlaWorkspaceLayout>
			<TlaWorkspaceHome key={workspaceId} workspaceId={workspaceId} />
		</TlaWorkspaceLayout>
	)
}
