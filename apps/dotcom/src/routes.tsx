import { captureException } from '@sentry/react'
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import { ReactNode, useEffect } from 'react'
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
import { TlaIcon } from './components-tla/TlaIcon'
import { TlaSidebar } from './components-tla/TlaSidebar'
import { DefaultErrorFallback } from './components/DefaultErrorFallback/DefaultErrorFallback'
import { ErrorPage } from './components/ErrorPage/ErrorPage'
import { AppStateProvider, useApp } from './hooks/useAppState'
import { useAuth } from './tla-hooks/useAuth'
import { getCleanId } from './utils/tla/tldrawApp'

const enableTemporaryLocalBemo =
	window.location.hostname === 'localhost' &&
	window.location.port === '3000' &&
	typeof jest === 'undefined'

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
			<Route path="/" lazy={() => import('./pages/root')} />
			<Route path="/auth" lazy={() => import('./pages/auth')} />
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
			{enableTemporaryLocalBemo && (
				<Route path={`/bemo/:roomId`} lazy={() => import('./pages/temporary-bemo')} />
			)}

			<Route
				path="/:workspaceId"
				element={
					<RequireAuth>
						<TlaWrapper />
					</RequireAuth>
				}
			>
				<Route index element={<RedirectToMostRecentFile />} />
				<Route path="/:workspaceId/drafts" lazy={() => import('./pages/ws-drafts')} />
				<Route path="/:workspaceId/stars" lazy={() => import('./pages/ws-stars')} />
				<Route path="/:workspaceId/shared" lazy={() => import('./pages/ws-shared')} />
				<Route path="/:workspaceId/groups" lazy={() => import('./pages/ws-groups')} />
				<Route path="/:workspaceId/settings" lazy={() => import('./pages/ws-profile')} />
				<Route path="/:workspaceId/f/:fileId" lazy={() => import('./pages/ws-file')} />
			</Route>
		</Route>
		<Route path="*" lazy={() => import('./pages/not-found')} />
	</Route>
)

function RequireAuth({ children }: { children: ReactNode }) {
	const location = useLocation()
	const { workspaceId } = useParams()
	const auth = useAuth()

	if (!auth) {
		// Redirect them to the /login page, but save the current location they were
		// trying to go to when they were redirected. This allows us to send them
		// along to that page after they login, which is a nicer user experience
		// than dropping them off on the home page.
		return <Navigate to="/auth" state={{ from: location }} replace />
	}

	if (getCleanId(auth.workspaceId) !== workspaceId) {
		return <div>you cant see that</div>
	}

	return children
}

export function TlaWrapper() {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])

	return (
		<div className="tla tla_layout" data-sidebar={isSidebarOpen}>
			<TlaSidebar />
			<button className="tla_sidebar_toggle" onClick={() => app.toggleSidebar()}>
				<TlaIcon icon="sidebar" />
			</button>
			<Outlet />
		</div>
	)
}

function RedirectToMostRecentFile() {
	const app = useApp()
	const file = useValue(
		'most recent file',
		() => {
			const session = app.getSessionState()
			if (!session.auth) return
			return app.getUserFiles(session.auth.userId, session.auth.workspaceId)[0]
		},
		[app]
	)
	if (!file) throw Error('File not found')

	return <Navigate to={`/${getCleanId(file.workspaceId)}/f/${getCleanId(file.id)}`} />
}
