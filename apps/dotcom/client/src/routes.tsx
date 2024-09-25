import { captureException } from '@sentry/react'
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import {
	Navigate,
	Outlet,
	Route,
	createRoutesFromElements,
	useLocation,
	useParams,
	useRouteError,
} from 'react-router-dom'
import { deleteFromLocalStorage, getFromLocalStorage } from 'tldraw'
import { DefaultErrorFallback } from './components/DefaultErrorFallback/DefaultErrorFallback'
import { ErrorPage } from './components/ErrorPage/ErrorPage'
import { TlaErrorPage } from './tla/components/TlaErrorPage'
import { AppStateProvider, useApp } from './tla/hooks/useAppState'
import { useAuth } from './tla/hooks/useAuth'
import { useSessionState } from './tla/hooks/useSessionState'
import { TldrawAppFileRecordType } from './tla/utils/schema/TldrawAppFile'
import { TEMPORARY_FILE_KEY } from './tla/utils/temporary-files'
import { getCleanId } from './tla/utils/tldrawAppSchema'
import { getFileUrl, getWorkspaceUrl } from './tla/utils/urls'

export const router = createRoutesFromElements(
	<Route
		element={
			// Add all top level providers that require the router here

			<Outlet />
		}
		ErrorBoundary={() => {
			const error = useRouteError()
			useEffect(() => {
				captureException(error)
			}, [error])
			return (
				<ErrorPage
					messages={{
						header: 'Something went wrong',
						para1:
							'Please try refreshing the page. Still having trouble? Let us know at hello@tldraw.com.',
					}}
				/>
			)
		}}
	>
		<Route errorElement={<DefaultErrorFallback />}>
			<Route path="/" lazy={() => import('./pages/root')} />
			<Route path={`/${ROOM_PREFIX}`} lazy={() => import('./pages/new')} />
			<Route path="/new" lazy={() => import('./pages/new')} />
			<Route path={`/ts-side`} lazy={() => import('./pages/public-touchscreen-side-panel')} />
			<Route path={`/${ROOM_PREFIX}/:roomId`} lazy={() => import('./pages/public-multiplayer')} />
			<Route path={`/${ROOM_PREFIX}/:boardId/history`} lazy={() => import('./pages/history')} />
			<Route
				path={`/${ROOM_PREFIX}/:boardId/history/:timestamp`}
				lazy={() => import('./pages/history-snapshot')}
			/>
			<Route path={`/${SNAPSHOT_PREFIX}/:roomId`} lazy={() => import('./pages/public-snapshot')} />
			<Route
				path={`/${READ_ONLY_LEGACY_PREFIX}/:roomId`}
				lazy={() => import('./pages/public-readonly-legacy')}
			/>
			<Route path={`/${READ_ONLY_PREFIX}/:roomId`} lazy={() => import('./pages/public-readonly')} />
		</Route>
		{/* begin tla */}
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
			<Route path="/q/local" lazy={() => import('./tla/pages/local')} />
			{/* Force route to auth */}
			<Route path="/q/auth" lazy={() => import('./tla/pages/auth')} />
			{/* Temporary file */}
			<Route path="/q/t/:fileId" lazy={() => import('./tla/pages/file-temp')} />
			{/* Workspace */}
			<Route path="/q/w" element={<Outlet />}>
				<Route index element={<RedirectAtWorkspacesRoot />} />
				<Route path="/q/w/:workspaceId" element={<RequireAuthForWorkspace />}>
					<Route index element={<RedirectAtWorkspaceRoot />} />
					{/* File view*/}
					<Route path="/q/w/:workspaceId/f/:fileId" lazy={() => import('./tla/pages/file')} />
					{/* List views */}
					<Route path="/q/w/:workspaceId/drafts" lazy={() => import('./tla/pages/drafts')} />
					<Route path="/q/w/:workspaceId/stars" lazy={() => import('./tla/pages/stars')} />
					<Route path="/q/w/:workspaceId/shared" lazy={() => import('./tla/pages/shared')} />
					<Route path="/q/w/:workspaceId/groups" lazy={() => import('./tla/pages/groups')} />
					{/* Workspace settings */}
					<Route path="/q/w/:workspaceId/settings" lazy={() => import('./tla/pages/settings')} />
					{/* User settings */}
					<Route path="/q/w/:workspaceId/profile" element={<RequireAuthForUser />}>
						<Route index lazy={() => import('./tla/pages/profile')} />
					</Route>
					{/* Internal */}
					<Route path="/q/w/:workspaceId/debug" lazy={() => import('./tla/pages/debug')} />
				</Route>
			</Route>
		</Route>
		{/* end tla */}
		<Route path="*" lazy={() => import('./pages/not-found')} />
	</Route>
)

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
