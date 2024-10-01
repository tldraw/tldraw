import { captureException } from '@sentry/react'
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { Outlet, Route, createRoutesFromElements, useRouteError } from 'react-router-dom'
import { DefaultErrorFallback } from './components/DefaultErrorFallback/DefaultErrorFallback'
import { ErrorPage } from './components/ErrorPage/ErrorPage'

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
		<Route lazy={() => import('./tla/providers/TlaClerkProvider')}>
			<Route path="/q/local" lazy={() => import('./tla/pages/local')} />
			<Route lazy={() => import('./tla/providers/TlaAppLoggedInProvider')}>
				{/* If not redirected, then local */}
				<Route path="/q" lazy={() => import('./tla/components/RedirectAtRoot')} />
				{/* File view*/}
				<Route path="/q/f/:fileSlug" lazy={() => import('./tla/pages/file')} />
				{/* User settings */}
				<Route path="/q/profile" lazy={() => import('./tla/components/RequireAuthForUser')}>
					<Route index lazy={() => import('./tla/pages/profile')} />
				</Route>
				{/* Internal */}
				<Route path="/q/debug" lazy={() => import('./tla/pages/debug')} />
			</Route>
		</Route>
		{/* end tla */}
		<Route path="*" lazy={() => import('./pages/not-found')} />
	</Route>
)
