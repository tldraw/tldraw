import { captureException } from '@sentry/react'
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { useEffect } from 'react'
import { Link, Route, createRoutesFromElements, useRouteError } from 'react-router-dom'
import { DefaultErrorFallback } from './components/DefaultErrorFallback/DefaultErrorFallback'
import { ErrorPage } from './components/ErrorPage/ErrorPage'

export const router = createRoutesFromElements(
	<Route
		ErrorBoundary={() => {
			const error = useRouteError()
			useEffect(() => {
				captureException(error)
			}, [error])

			if (error instanceof TLRemoteSyncError) {
				switch (error.reason) {
					case TLSyncErrorCloseEventReason.NOT_FOUND: {
						return (
							<ErrorPage
								messages={{
									header: 'Not found',
									para1: 'The file you are looking for does not exist.',
								}}
							/>
						)
					}
					case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED: {
						return (
							<ErrorPage
								messages={{
									header: 'Unauthorized',
									para1: 'You need to be signed in to view this file.',
								}}
							/>
						)
					}
					case TLSyncErrorCloseEventReason.FORBIDDEN: {
						return (
							<ErrorPage
								messages={{
									header: 'Unauthorized',
									para1: 'You need to be authorized to view this file.',
								}}
								cta={
									<Link to={'/q'} target={'_self'}>
										{'Back to tldraw.'}
									</Link>
								}
							/>
						)
					}
				}
			}

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
			{/* We don't want to index multiplayer rooms */}
			<Route lazy={() => import('./pages/noindex')}>
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
		</Route>
		{/* begin tla */}
		<Route lazy={() => import('./tla/providers/TlaRootProviders')}>
			<Route path="/q" lazy={() => import('./tla/pages/local')} />
			{/* File view */}
			<Route path="/q/f/:fileSlug" lazy={() => import('./tla/pages/file')} />
			<Route path="/q/s/:fileSlug" lazy={() => import('./tla/pages/snapshot')} />
			{/* Views that require login */}
			<Route lazy={() => import('./tla/providers/RequireSignedInUser')}>
				{/* User settings */}
				<Route path="/q/profile" lazy={() => import('./tla/pages/profile')} />
				{/* Internal */}
				<Route path="/q/debug" lazy={() => import('./tla/pages/debug')} />
			</Route>
		</Route>
		{/* end tla */}
		<Route path="*" lazy={() => import('./pages/not-found')} />
	</Route>
)
