import { captureException } from '@sentry/react'
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { Suspense, lazy, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Outlet, Route, createRoutesFromElements, useRouteError } from 'react-router-dom'
import { DefaultErrorFallback } from './components/DefaultErrorFallback/DefaultErrorFallback'
import { ErrorPage } from './components/ErrorPage/ErrorPage'
import { notFound } from './pages/not-found'
import { IntlProvider } from './tla/utils/i18n'
import { TlaNotFoundError } from './tla/utils/notFoundError'
import { PREFIX } from './tla/utils/urls'

const LoginRedirectPage = lazy(() => import('./components/LoginRedirectPage/LoginRedirectPage'))

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
					case TLSyncErrorCloseEventReason.NOT_FOUND: {
						header = 'Not found'
						para1 = 'The file you are looking for does not exist.'
						break
					}
					case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED: {
						return (
							<Suspense>
								<LoginRedirectPage />
							</Suspense>
						)
					}
					case TLSyncErrorCloseEventReason.FORBIDDEN: {
						header = 'Invite only'
						para1 = `You don't have permission to view this room.`
						break
					}

					case TLSyncErrorCloseEventReason.RATE_LIMITED: {
						header = 'Rate limited'
						para1 = `Please slow down.`
						break
					}
				}
			}
			if (error instanceof TlaNotFoundError) {
				return notFound()
			}

			return (
				<ErrorPage
					messages={{
						header,
						para1,
					}}
				/>
			)
		}}
	>
		<Route errorElement={<DefaultErrorFallback />}>
			<Route path="/" lazy={() => import('./pages/root')} />
			{/* We don't want to index multiplayer rooms */}
			<Route element={<NoIndex />}>
				<Route element={<ShimIntlProvider />}>
					<Route path={`/${ROOM_PREFIX}`} lazy={() => import('./pages/new')} />
					<Route path="/new" lazy={() => import('./pages/new')} />
					<Route path={`/ts-side`} lazy={() => import('./pages/public-touchscreen-side-panel')} />
					<Route
						path={`/${ROOM_PREFIX}/:roomId`}
						lazy={() => import('./pages/public-multiplayer')}
					/>
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
		</Route>
		{/* begin tla */}
		<Route element={<NoIndex />}>
			<Route lazy={() => import('./tla/providers/TlaRootProviders')}>
				<Route path={`/${PREFIX.tla}`} lazy={() => import('./tla/pages/local')} />
				{/* <Route path={`/${PREFIX.tla}/playground`} lazy={() => import('./tla/pages/playground')} /> */}
				{/* File view */}
				<Route
					path={`/${PREFIX.tla}/${PREFIX.file}/:fileSlug`}
					lazy={() => import('./tla/pages/file')}
				/>
				<Route
					path={`/${PREFIX.tla}/${PREFIX.publish}/:fileSlug`}
					lazy={() => import('./tla/pages/publish')}
				/>
				{/* Views that require login */}
				<Route lazy={() => import('./tla/providers/RequireSignedInUser')}></Route>
			</Route>
		</Route>
		{/* end tla */}
		<Route path="*" lazy={() => import('./pages/not-found')} />
	</Route>
)

function NoIndex() {
	return (
		<>
			<Helmet>
				<meta name="robots" content="noindex, noimageindex, nofollow" />
			</Helmet>
			<Outlet />
		</>
	)
}

function ShimIntlProvider() {
	return (
		// This IntlProvider is just for backwards compatibilty for the old site.
		<IntlProvider defaultLocale="en" locale="en" messages={{}}>
			<Outlet />
		</IntlProvider>
	)
}
