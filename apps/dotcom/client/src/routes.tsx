import { captureException } from '@sentry/react'
import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { Suspense, lazy, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Outlet, Route, createRoutesFromElements, redirect, useRouteError } from 'react-router-dom'
import { ErrorPage } from './components/ErrorPage/ErrorPage'
import { notFound } from './pages/not-found'
import { ROUTES, routes } from './routeDefs'
import { TlaNotFoundError } from './tla/utils/notFoundError'

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
		<Route lazy={() => import('./tla/providers/TlaRootProviders')}>
			<Route path={ROUTES.tlaRoot} lazy={() => import('./tla/pages/local')} />
			<Route element={<NoIndex />}>
				<Route path={ROUTES.tlaNew} lazy={() => import('./pages/tla-new')} />
				<Route path={ROUTES.tlaOptIn} loader={() => redirect(routes.tlaRoot())} />
				<Route path={ROUTES.tlaLocalFile} lazy={() => import('./tla/pages/local-file')} />
				<Route
					path={ROUTES.tlaLocalFileIndex}
					lazy={() => import('./tla/pages/local-file-index')}
				/>
				{/* File view */}
				<Route path={ROUTES.tlaFile} lazy={() => import('./tla/pages/file')} />
				<Route path={ROUTES.tlaFileHistory} lazy={() => import('./tla/pages/file-history')} />
				<Route
					path={ROUTES.tlaFileHistorySnapshot}
					lazy={() => import('./tla/pages/file-history-snapshot')}
				/>

				<Route path={ROUTES.tlaPublish} lazy={() => import('./tla/pages/publish')} />
				{/* Legacy room */}
				<Route path={ROUTES.tlaLegacyRoom} lazy={() => import('./tla/pages/legacy-room')} />
				{/* Legacy readonly */}
				<Route path={ROUTES.tlaLegacyReadonly} lazy={() => import('./tla/pages/legacy-readonly')} />
				<Route
					path={ROUTES.tlaLegacyReadonlyOld}
					lazy={() => import('./tla/pages/legacy-readonly-old')}
				/>
				{/* Legacy snapshot */}
				<Route path={ROUTES.tlaLegacySnapshot} lazy={() => import('./tla/pages/legacy-snapshot')} />
				{/* Legacy history */}
				<Route
					path={ROUTES.tlaLegacyRoomHistory}
					lazy={() => import('./tla/pages/legacy-history')}
				/>
				{/* Legacy history snapshot */}
				<Route
					path={ROUTES.tlaLegacyRoomHistorySnapshot}
					lazy={() => import('./tla/pages/legacy-history-snapshot')}
				/>
				{/* Views that require login */}
				<Route lazy={() => import('./tla/providers/RequireSignedInUser')}></Route>
				<Route path="/admin" lazy={() => import('./pages/admin')} />
			</Route>
		</Route>
		<Route path="/__debug-tail" lazy={() => import('./tla/pages/worker-debug-tail')} />
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
