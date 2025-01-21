import { captureException } from '@sentry/react'
import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { Suspense, lazy, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Outlet, Route, createRoutesFromElements, useRouteError } from 'react-router-dom'
import { getFromLocalStorage } from 'tldraw'
import { DefaultErrorFallback } from './components/DefaultErrorFallback/DefaultErrorFallback'
import { ErrorPage } from './components/ErrorPage/ErrorPage'
import { notFound } from './pages/not-found'
import { ROUTES } from './routeDefs'
import { IntlProvider } from './tla/utils/i18n'
import { TlaNotFoundError } from './tla/utils/notFoundError'

const LoginRedirectPage = lazy(() => import('./components/LoginRedirectPage/LoginRedirectPage'))

export const tlaOverrideFlag = 'tla-override-flag'
export const tlaProbablyLoggedInFlag = 'tla-probably-logged-in-flag'

const isOverrideFlagSet = !!getFromLocalStorage(tlaOverrideFlag) || navigator.webdriver
const isProbablyLoggedIn = !!getFromLocalStorage(tlaProbablyLoggedInFlag)

export const legacyRoutes = (
	<Route errorElement={<DefaultErrorFallback />}>
		<Route path={ROUTES.legacyRoot} lazy={() => import('./pages/root')} />
		{/* We don't want to index multiplayer rooms */}
		<Route element={<NoIndex />}>
			<Route lazy={() => import('./tla/providers/TlaRootProviders')}>
				<Route path={ROUTES.tlaOptIn} lazy={() => import('./pages/tla-opt-in')} />
				<Route path={ROUTES.tlaOverride} lazy={() => import('./pages/tla-override')} />
				<Route path={ROUTES.tlaFile} lazy={() => import('./tla/pages/file')} />
				<Route path={ROUTES.tlaPublish} lazy={() => import('./tla/pages/publish')} />
			</Route>
			<Route element={<ShimIntlProvider />}>
				<Route path={ROUTES.legacyNewPage} lazy={() => import('./pages/new')} />
				<Route path={ROUTES.legacyNewPage2} lazy={() => import('./pages/new')} />
				<Route
					path={ROUTES.touchscreenSidePanel}
					lazy={() => import('./pages/public-touchscreen-side-panel')}
				/>
				<Route path={ROUTES.legacyRoom} lazy={() => import('./pages/public-multiplayer')} />
				<Route path={ROUTES.legacyRoomHistory} lazy={() => import('./pages/history')} />
				<Route
					path={ROUTES.legacyRoomHistorySnapshot}
					lazy={() => import('./pages/history-snapshot')}
				/>
				<Route path={ROUTES.legacySnapshot} lazy={() => import('./pages/public-snapshot')} />
				<Route
					path={ROUTES.legacyReadonlyOld}
					lazy={() => import('./pages/public-readonly-legacy')}
				/>
				<Route path={ROUTES.legacyReadonly} lazy={() => import('./pages/public-readonly')} />
			</Route>
		</Route>
	</Route>
)

export const tlaRoutes = (
	<Route>
		<Route element={<ShimIntlProvider />}>
			<Route
				path={ROUTES.touchscreenSidePanel}
				lazy={() => import('./pages/public-touchscreen-side-panel')}
			/>
		</Route>
		<Route lazy={() => import('./tla/providers/TlaRootProviders')}>
			<Route path={ROUTES.tlaRoot} lazy={() => import('./tla/pages/local')} />
			<Route element={<NoIndex />}>
				<Route path={ROUTES.tlaLocalFile} lazy={() => import('./tla/pages/local-file')} />
				{/* <Route path={ROUTES.tlaPlayground} lazy={() => import('./tla/pages/playground')} /> */}
				{/* File view */}
				<Route path={ROUTES.tlaFile} lazy={() => import('./tla/pages/file')} />
				<Route path={ROUTES.tlaPublish} lazy={() => import('./tla/pages/publish')} />
				{/* Legacy room */}
				<Route path={ROUTES.tlaLegacyRoom} lazy={() => import('./tla/pages/legacy-room')} />
				{/* Legacy readonly */}
				<Route path={ROUTES.tlaLegacyReadonly} lazy={() => import('./tla/pages/legacy-readonly')} />
				<Route
					path={ROUTES.tlaLegacyReadonlyOld}
					lazy={() => import('./tla/pages/legacy-readonly-old')}
				/>
				{/* Legacy new */}
				<Route path={ROUTES.legacyNewPage} lazy={() => import('./pages/new')} />
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
				<Route path={ROUTES.tlaOverride} lazy={() => import('./pages/tla-override')} />
			</Route>
		</Route>
	</Route>
)

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
		{isProbablyLoggedIn || isOverrideFlagSet ? tlaRoutes : legacyRoutes}
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

function ShimIntlProvider() {
	return (
		// This IntlProvider is just for backwards compatibilty for the old site.
		<IntlProvider defaultLocale="en" locale="en" messages={{}}>
			<Outlet />
		</IntlProvider>
	)
}
