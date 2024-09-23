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
import { useValue } from 'tldraw'
import { TlaWrapperPublicPage } from './components-tla/TlaWrapperPublicPage'
import { DefaultErrorFallback } from './components/DefaultErrorFallback/DefaultErrorFallback'
import { ErrorPage } from './components/ErrorPage/ErrorPage'
import { AppStateProvider, useApp } from './hooks/useAppState'
import { useAuth } from './tla-hooks/useAuth'
import { TldrawAppFile } from './utils/tla/schema/TldrawAppFile'
import { TldrawAppUser } from './utils/tla/schema/TldrawAppUser'
import { TldrawAppWorkspaceId } from './utils/tla/schema/TldrawAppWorkspace'
import { getCleanId } from './utils/tla/tldrawAppSchema'
import { getFileUrl, getUserUrl, getWorkspaceUrl } from './utils/tla/urls'

export const router = createRoutesFromElements(
	<Route
		element={
			// Add all top level providers that require the router here
			<AppStateProvider>
				<Outlet />
			</AppStateProvider>
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
			<Route path="/" element={<RedirectAtRoot />}>
				<Route index lazy={() => import('./pages/root')} />
			</Route>
			<Route element={<TlaWrapperPublicPage />}>
				<Route path="/offline" lazy={() => import('./pages/ws-local')} />
				<Route path={`/${ROOM_PREFIX}`} lazy={() => import('./pages/new')} />
				<Route path="/new" lazy={() => import('./pages/new')} />
				<Route path={`/ts-side`} lazy={() => import('./pages/public-touchscreen-side-panel')} />
				<Route path={`/${ROOM_PREFIX}/:roomId`} lazy={() => import('./pages/public-multiplayer')} />
				<Route path={`/${ROOM_PREFIX}/:boardId/history`} lazy={() => import('./pages/history')} />
				<Route
					path={`/${ROOM_PREFIX}/:boardId/history/:timestamp`}
					lazy={() => import('./pages/history-snapshot')}
				/>
				<Route
					path={`/${SNAPSHOT_PREFIX}/:roomId`}
					lazy={() => import('./pages/public-snapshot')}
				/>
				<Route
					path={`/${READ_ONLY_LEGACY_PREFIX}/:roomId`}
					lazy={() => import('./pages/public-readonly-legacy')}
				/>
				<Route
					path={`/${READ_ONLY_PREFIX}/:roomId`}
					lazy={() => import('./pages/public-readonly')}
				/>
			</Route>
			{/* Users */}
			<Route path="/u" element={<RedirectAtUsersRoot />} />
			<Route path="/u/:userId" element={<RequireAuthForUser />}>
				<Route index element={<RedirectAtUserIndex />} />
				<Route path="/u/:userId/profile" lazy={() => import('./pages/ws-profile')} />
			</Route>
			{/* Workspaces */}
			<Route path="/w" element={<RedirectAtWorkspacesRoot />} />
			<Route path="/w/:workspaceId" element={<RequireAuthForWorkspace />}>
				<Route index element={<RedirectAtWorkspaceRoot />} />
				{/* <Route index lazy={() => import('./pages/ws-maybe')} /> */}
				<Route path="/w/:workspaceId/debug" lazy={() => import('./pages/ws-debug')} />
				<Route path="/w/:workspaceId/drafts" lazy={() => import('./pages/ws-drafts')} />
				<Route path="/w/:workspaceId/stars" lazy={() => import('./pages/ws-stars')} />
				<Route path="/w/:workspaceId/shared" lazy={() => import('./pages/ws-shared')} />
				<Route path="/w/:workspaceId/groups" lazy={() => import('./pages/ws-groups')} />
				<Route path="/w/:workspaceId/settings" lazy={() => import('./pages/ws-profile')} />
				<Route path="/w/:workspaceId/f/:fileId" lazy={() => import('./pages/ws-file')} />
			</Route>
		</Route>
		{/* Auth */}
		<Route path="/auth" lazy={() => import('./pages/auth')} />
		<Route path="*" lazy={() => import('./pages/not-found')} />
	</Route>
)

const POSSIBLE_ERRORS = {
	'user is not authenticated': 'No authenticated user.',
	'workspace not found': 'Workspace not found.',
	'no user found for authenticated user id': 'User not found.',
	'no workspaces found for authenticated user': "You don't have any workspaces.",
	'user does not have access to this workspace': "You don't have access to this workspace.",
	'user does not have access to this profile': "You don't have access to this profile.",
}

function RedirectAtRoot() {
	const auth = useAuth()
	if (auth) return <Navigate to="/w" replace />
	return <Outlet />
}

function RedirectAtUserIndex() {
	const location = useLocation()
	const { userId } = useParams()

	return <Navigate to={`/u/${userId}/profile`} state={{ from: location }} replace />
}

function RedirectAtUsersRoot() {
	const app = useApp()

	const result = useValue<
		| { type: 'error'; error: keyof typeof POSSIBLE_ERRORS }
		| { type: 'success'; user: TldrawAppUser }
	>(
		'result',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) {
				return {
					type: 'error',
					error: 'user is not authenticated',
				}
			}

			const user = app.store.get(auth.userId)
			if (!user) {
				return {
					type: 'error',
					error: 'no user found for authenticated user id',
				}
			}

			return { type: 'success', user }
		},
		[app]
	)

	if (result.type === 'error') {
		switch (result.error) {
			case 'user is not authenticated': {
				return <Navigate to={`/auth`} replace />
			}
			default: {
				return <Navigate to={`/ws-error`} replace />
			}
		}
	}

	return <Navigate to={getUserUrl(result.user.id)} replace />
}

function RequireAuthForUser() {
	const app = useApp()

	const { userId } = useParams()

	const result = useValue<
		{ type: 'error'; error: keyof typeof POSSIBLE_ERRORS } | { type: 'success' }
	>(
		'result',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) {
				return {
					type: 'error',
					error: 'user is not authenticated',
				}
			}

			if (userId !== getCleanId(auth.userId)) {
				return {
					type: 'error',
					error: 'user does not have access to this profile',
				}
			}

			return { type: 'success' }
		},
		[app, userId]
	)

	if (result.type === 'error') {
		switch (result.error) {
			case 'user is not authenticated': {
				return <Navigate to={`/auth`} replace />
			}
			default: {
				return <Navigate to={`/ws-error`} replace />
			}
		}
	}

	return <Outlet />
}

function RequireAuthForWorkspace() {
	const app = useApp()

	const { workspaceId } = useParams()

	const result = useValue<
		{ type: 'error'; error: keyof typeof POSSIBLE_ERRORS } | { type: 'success' }
	>(
		'result',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) {
				return {
					type: 'error',
					error: 'user is not authenticated',
				}
			}

			if (workspaceId !== getCleanId(auth.workspaceId)) {
				return {
					type: 'error',
					error: 'user does not have access to this workspace',
				}
			}

			return { type: 'success' }
		},
		[app, workspaceId]
	)

	if (result.type === 'error') {
		switch (result.error) {
			case 'user is not authenticated': {
				return <Navigate to={`/auth`} replace />
			}
			default: {
				return <Navigate to={`/ws-error`} replace />
			}
		}
	}

	return <Outlet />
}

function RedirectAtWorkspacesRoot() {
	const app = useApp()

	const result = useValue<
		| { type: 'error'; error: keyof typeof POSSIBLE_ERRORS }
		| { type: 'success'; workspaceId: TldrawAppWorkspaceId }
	>(
		'result',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) {
				return {
					type: 'error',
					error: 'user is not authenticated',
				}
			}

			return { type: 'success', workspaceId: auth.workspaceId }

			// When multiple workspaces...
			// Get the user's last visited workspace id
			// If we have a last visited workspace id, use that
			// If not, get all the user's workspaces...
			// ...and use the most recently created one
		},
		[app]
	)

	if (result.type === 'error') {
		switch (result.error) {
			case 'user is not authenticated': {
				return <Navigate to={`/auth`} replace />
			}
			default: {
				return <Navigate to={`/ws-error`} replace />
			}
		}
	}

	return <Navigate to={getWorkspaceUrl(result.workspaceId)} replace />
}

function RedirectAtWorkspaceRoot() {
	const app = useApp()
	const result = useValue<
		| { type: 'error'; error: keyof typeof POSSIBLE_ERRORS }
		| { type: 'success'; file: TldrawAppFile }
	>(
		'workspace redirect',
		() => {
			const { auth, createdAt } = app.getSessionState()
			if (!auth) {
				return {
					type: 'error',
					error: 'user is not authenticated',
				}
			}

			const { userId, workspaceId } = auth

			// First, try to bring back the most recently visited file
			const recentFiles = app.getUserRecentFiles(userId, workspaceId, createdAt)
			if (recentFiles.length) {
				return {
					type: 'success',
					file: recentFiles[0].file,
				}
			}

			// If there's no visit, get the most recently created file for the user
			const files = app
				.getUserOwnFiles(userId, workspaceId)
				.sort((a, b) => b.createdAt - a.createdAt)
			if (files.length) {
				return {
					type: 'success',
					file: files[0],
				}
			}

			// If for some reason there's no file at all for this user, create one
			const file = app.createFile(userId, workspaceId)

			return {
				type: 'success',
				file: file,
			}
		},
		[app]
	)

	if (result.type === 'error') {
		switch (result.error) {
			case 'user is not authenticated': {
				return <Navigate to={`/auth`} replace />
			}
			default: {
				return <Navigate to={`/ws-error`} replace />
			}
		}
	}

	return <Navigate to={getFileUrl(result.file.workspaceId, result.file.id)} />
}
