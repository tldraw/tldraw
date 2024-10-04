import { captureException } from '@sentry/react'
import { TLIncompatibilityReason, TLRemoteSyncError } from '@tldraw/sync-core'
import { useEffect } from 'react'
import { Route, createRoutesFromElements, useRouteError } from 'react-router-dom'
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
		<Route lazy={() => import('./tla/providers/TlaClerkProvider')}>
			<Route path="/local" lazy={() => import('./tla/pages/local')} />
			<Route lazy={() => import('./tla/providers/TlaAppLoggedInProvider')}>
				{/* If not redirected, then local */}
				<Route path="/" lazy={() => import('./tla/components/RedirectAtRoot')} />
				{/* File view*/}
				<Route path="/f/:fileSlug" lazy={() => import('./tla/pages/file')} />
				{/* User settings */}
				<Route path="/profile" lazy={() => import('./tla/components/RequireAuthForUser')}>
					<Route index lazy={() => import('./tla/pages/profile')} />
				</Route>
				{/* Internal */}
				<Route path="/debug" lazy={() => import('./tla/pages/debug')} />
			</Route>
		</Route>
		{/* end tla */}
		<Route path="*" lazy={() => import('./pages/not-found')} />
	</Route>
)
