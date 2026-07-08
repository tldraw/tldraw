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

interface CreateAppRouterOptions {
	includeDevRoutes?: boolean
}

function getDefaultIncludeDevRoutes() {
	// @ts-ignore this is provided by Vite
	if (import.meta.env.DEV) return true
	// Also include them on PR preview deploys (pr-<N>-preview-deploy.tldraw.com) so
	// the /dev/components gallery is shareable, without exposing it in production.
	return typeof window !== 'undefined' && window.location.hostname.includes('preview-deploy')
}

export function createAppRouter({
	includeDevRoutes = getDefaultIncludeDevRoutes(),
}: CreateAppRouterOptions = {}) {
	return createRoutesFromElements(
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
			{includeDevRoutes && (
				<>
					<Route
						path="/dev/reset-local-state"
						lazy={() => import('./pages/dev-reset-local-state')}
					/>
					<Route path="/dev/components/buttons" lazy={() => import('./pages/dev-buttons')} />
					<Route path="/dev/components/inputs" lazy={() => import('./pages/dev-inputs')} />
					<Route path="/dev/components/typography" lazy={() => import('./pages/dev-typography')} />
					<Route path="/dev/components/dialogs" lazy={() => import('./pages/dev-dialogs')} />
					<Route path="/dev/components/menus" lazy={() => import('./pages/dev-menus')} />
					<Route path="/dev/components/icons" lazy={() => import('./pages/dev-icons')} />
					<Route path="/dev/components/links" lazy={() => import('./pages/dev-links')} />
					<Route path="/dev/components/overlays" lazy={() => import('./pages/dev-overlays')} />
					<Route
						path="/dev/components/form-controls"
						lazy={() => import('./pages/dev-form-controls')}
					/>
					<Route path="/dev/components/presence" lazy={() => import('./pages/dev-presence')} />
					<Route path="/dev/components/logo" lazy={() => import('./pages/dev-logo')} />
					<Route path="/dev/components/states" lazy={() => import('./pages/dev-states')} />
					<Route path="/dev/components/sidebar" lazy={() => import('./pages/dev-sidebar')} />
					<Route path="/dev/components/editor" lazy={() => import('./pages/dev-editor')} />
					<Route path="/dev/components/timestamps" lazy={() => import('./pages/dev-timestamps')} />
					<Route path="/dev/components/identity" lazy={() => import('./pages/dev-identity')} />
					<Route path="/dev/components/z-index" lazy={() => import('./pages/dev-zindex')} />
				</>
			)}
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
					<Route
						path={ROUTES.tlaFilePierreHistory}
						lazy={() => import('./tla/pages/file-pierre-history')}
					/>
					<Route
						path={ROUTES.tlaFilePierreHistorySnapshot}
						lazy={() => import('./tla/pages/file-pierre-history-snapshot')}
					/>

					<Route path={ROUTES.tlaPublish} lazy={() => import('./tla/pages/publish')} />
					<Route path={ROUTES.tlaImport} lazy={() => import('./tla/pages/import')} />
					<Route path={ROUTES.tlaInvite} lazy={() => import('./tla/pages/invite')} />
					{/* Legacy room */}
					<Route path={ROUTES.tlaLegacyRoom} lazy={() => import('./tla/pages/legacy-room')} />
					{/* Legacy readonly */}
					<Route
						path={ROUTES.tlaLegacyReadonly}
						lazy={() => import('./tla/pages/legacy-readonly')}
					/>
					<Route
						path={ROUTES.tlaLegacyReadonlyOld}
						lazy={() => import('./tla/pages/legacy-readonly-old')}
					/>
					{/* Legacy snapshot */}
					<Route
						path={ROUTES.tlaLegacySnapshot}
						lazy={() => import('./tla/pages/legacy-snapshot')}
					/>
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
}

export const router = createAppRouter()

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
