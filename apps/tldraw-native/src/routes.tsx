import { captureException } from '@sentry/react'
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import { TLIncompatibilityReason, TLRemoteSyncError } from '@tldraw/sync-core'
import { useEffect } from 'react'
import { Route, createRoutesFromElements, useRouteError } from 'react-router-dom'
import { DefaultErrorFallback } from './components/DefaultErrorFallback/DefaultErrorFallback'
import { ErrorPage } from './components/ErrorPage/ErrorPage'

export const router = createRoutesFromElements(
	<Route
		ErrorBoundary={() => {
			const error = useRouteError()
			useEffect(() => {
				captureException(error)
			}, [error])
			let header = 'Something went wrong'
			let para1 =
				'Please try refreshing the page. Still having trouble? Let us know at hello@tldraw.com.'
			if (error instanceof TLRemoteSyncError) {
				switch (error.reason) {
					case TLIncompatibilityReason.RoomNotFound: {
						header = 'Not found'
						para1 = 'The file you are looking for does not exist.'
						break
					}
					case TLIncompatibilityReason.Forbidden: {
						header = 'Unauthorized'
						para1 = 'You need to be authorized to view this file.'
						break
					}
				}
			}
			return <ErrorPage messages={{ header, para1 }} />
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
