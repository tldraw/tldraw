import { captureException } from '@sentry/react'
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { Navigate, Outlet, Route, createRoutesFromElements, useRouteError } from 'react-router-dom'
import { DefaultErrorFallback } from './components/DefaultErrorFallback/DefaultErrorFallback'
import { ErrorPage } from './components/ErrorPage/ErrorPage'
import { useApp } from './tla/hooks/useAppState'
import { useAuth } from './tla/hooks/useAuth'
import { useSessionState } from './tla/hooks/useSessionState'
import { getFileUrl } from './tla/utils/urls'

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
		<Route path="/q/local" lazy={() => import('./tla/pages/local')} />
		<Route path="/q/auth" lazy={() => import('./tla/pages/auth')} />
		<Route lazy={() => import('./tla/components/TlaAppProvider')}>
			{/* If not redirected, then local */}
			<Route path="/q" element={<RedirectAtRoot />} />
			{/* Temporary file */}
			<Route path="/q/t/:fileSlug" lazy={() => import('./tla/pages/file-temp')} />
			{/* File view*/}
			<Route path="/q/f/:fileSlug" lazy={() => import('./tla/pages/file')} />
			{/* User settings */}
			<Route path="/q/profile" element={<RequireAuthForUser />}>
				<Route index lazy={() => import('./tla/pages/profile')} />
			</Route>
			{/* Internal */}
			<Route path="/q/debug" lazy={() => import('./tla/pages/debug')} />
		</Route>
		{/* end tla */}
		<Route path="*" lazy={() => import('./pages/not-found')} />
	</Route>
)

/**
 * At the workspace route, redirect to the user's most recent file.
 * Or log in and then come back here.
 */
function RedirectAtRoot() {
	const app = useApp()
	const { auth, createdAt } = useSessionState()

	if (!auth) throw Error('This should be wrapped in a workspace auth check')

	// Navigate to the most recent file (if there is one) or else a new file
	const file =
		app.getUserRecentFiles(auth.userId, createdAt)?.[0]?.file ?? app.createFile(auth.userId)

	return <Navigate to={getFileUrl(file.id)} replace />
}

/**
 * At the user index, an authenticated user should be taken to their workspaces.
 * The logic for what to show for a user's workspace is determined on the
 * workspaces route.
 */
function RequireAuthForUser() {
	const auth = useAuth()

	if (!auth) throw Error('This should be wrapped in a workspace auth check')

	return <Outlet />
}
