import { Navigate, Outlet, Route, useLocation, useParams } from 'react-router-dom'
import { deleteFromLocalStorage, getFromLocalStorage } from 'tldraw'
import { TlaErrorPage } from './components/TlaErrorPage'
import { AppStateProvider, useApp } from './hooks/useAppState'
import { useAuth } from './hooks/useAuth'
import { useSessionState } from './hooks/useSessionState'
import { TldrawAppFileRecordType } from './utils/schema/TldrawAppFile'
import { TEMPORARY_FILE_KEY } from './utils/temporary-files'
import { getCleanId } from './utils/tldrawAppSchema'
import { getFileUrl, getWorkspaceUrl } from './utils/urls'

export function TlaRoutes() {
	return (
		<Route
			path="/q"
			element={
				<AppStateProvider>
					<Outlet />
				</AppStateProvider>
			}
		>
			{/* If not redirected, then local */}
			<Route index element={<RedirectAtRoot />} />
			{/* Force route to local */}
			<Route path="/q/local" lazy={() => import('./pages/local')} />
			{/* Force route to auth */}
			<Route path="/q/auth" lazy={() => import('./pages/auth')} />
			{/* Temporary file */}
			<Route path="/q/t/:fileId" lazy={() => import('./pages/file-temp')} />
			{/* Workspace */}
			<Route path="/q/w" element={<Outlet />}>
				<Route index element={<RedirectAtWorkspacesRoot />} />
				<Route path="/q/w/:workspaceId" element={<RequireAuthForWorkspace />}>
					<Route index element={<RedirectAtWorkspaceRoot />} />
					<Route path="/q/w/:workspaceId/debug" lazy={() => import('./pages/debug')} />
					<Route path="/q/w/:workspaceId/drafts" lazy={() => import('./pages/drafts')} />
					<Route path="/q/w/:workspaceId/stars" lazy={() => import('./pages/stars')} />
					<Route path="/q/w/:workspaceId/shared" lazy={() => import('./pages/shared')} />
					<Route path="/q/w/:workspaceId/groups" lazy={() => import('./pages/groups')} />
					{/* File */}
					<Route path="/q/w/:workspaceId/f/:fileId" lazy={() => import('./pages/file')} />
					{/* Workspace settings */}
					<Route path="/q/w/:workspaceId/settings" lazy={() => import('./pages/settings')} />
					{/* User */}
					<Route path="/q/w/:workspaceId/profile" element={<RequireAuthForUser />}>
						<Route index lazy={() => import('./pages/profile')} />
					</Route>
				</Route>
			</Route>
		</Route>
	)
}

/**
 * At the root, an authenticated user should be taken to their workspaces.
 * The logic for what to show for a user's workspace is determined on the
 * workspaces route.
 */
function RedirectAtRoot() {
	const auth = useAuth()
	if (auth) return <Navigate to="/q/w" replace />
	return <Outlet />
}

/**
 * At the workspace route, redirect to the user's most recent file.
 * Or log in and then come back here.
 */
function RequireAuthForWorkspace() {
	const app = useApp()
	const location = useLocation()
	const { workspaceId } = useParams()
	const auth = useAuth()

	if (!auth) {
		// if the user does not have auth, redirect to auth and return here after authenticated
		return <Navigate to="/q/auth" state={{ from: location }} replace />
	}

	if (workspaceId !== getCleanId(auth.workspaceId)) {
		// if the user is not authenticated with this workspace (?), then handle that somehow
		return <TlaErrorPage error="no-workspace-access" />
	}

	// claim any temporary files, probably needs to be done async
	const temporaryFileId = getFromLocalStorage(TEMPORARY_FILE_KEY)
	if (temporaryFileId) {
		const fileId = TldrawAppFileRecordType.createId(temporaryFileId)
		app.claimTemporaryFile(auth.userId, auth.workspaceId, fileId)
		deleteFromLocalStorage(TEMPORARY_FILE_KEY)
	}

	return <Outlet />
}

/**
 * At the workspaces route, redirect to the user's authenticated workspace.
 * Or log in and then come back here.
 */
function RedirectAtWorkspacesRoot() {
	const auth = useAuth()

	if (!auth) {
		// if the user does not have auth, redirect to auth and return here after authenticated
		return <Navigate to="/q/auth" state={{ from: location }} replace />
	}

	return <Navigate to={getWorkspaceUrl(auth.workspaceId)} replace />
}

/**
 * At the workspace route, redirect to the user's most recent file.
 * Or log in and then come back here.
 */
function RedirectAtWorkspaceRoot() {
	const app = useApp()
	const { auth, createdAt } = useSessionState()

	if (!auth) throw Error('This should be wrapped in a workspace auth check')

	// Navigate to the most recent file (if there is one) or else a new file
	const file =
		app.getUserRecentFiles(auth.userId, auth.workspaceId, createdAt)?.[0]?.file ??
		app.createFile(auth.userId, auth.workspaceId)

	return <Navigate to={getFileUrl(auth.workspaceId, file.id)} replace />
}

/**
 * At the user index, an authenticated user should be taken to their workspaces.
 * The logic for what to show for a user's workspace is determined on the
 * workspaces route.
 */
function RequireAuthForUser() {
	const { userId } = useParams()

	const auth = useAuth()

	if (!auth) throw Error('This should be wrapped in a workspace auth check')

	if (userId !== getCleanId(auth.userId)) {
		// if the user is not authenticated as that user(?), then handle that somehow
		return <TlaErrorPage error="no-user-access" />
	}

	return <Outlet />
}
