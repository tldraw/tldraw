import { captureException } from '@sentry/react'
import { useEffect } from 'react'
import { createRoutesFromElements, Navigate, Outlet, Route, useRouteError } from 'react-router-dom'
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
			<Route path="/r" element={<Navigate to="/" />} />
			<Route path="/new" lazy={() => import('./pages/new')} />
			<Route path="/r/:roomId" lazy={() => import('./pages/public-multiplayer')} />
			<Route path="/r/:boardId/history" lazy={() => import('./pages/history')} />
			<Route
				path="/r/:boardId/history/:timestamp"
				lazy={() => import('./pages/history-snapshot')}
			/>
			<Route path="/s/:roomId" lazy={() => import('./pages/public-snapshot')} />
			<Route path="/v/:roomId" lazy={() => import('./pages/public-readonly-legacy')} />
			<Route path="/ro/:roomId" lazy={() => import('./pages/public-readonly')} />
		</Route>
		<Route path="*" lazy={() => import('./pages/not-found')} />
	</Route>
)
