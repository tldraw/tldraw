import { DefaultErrorFallback, ErrorBoundary } from '@tldraw/tldraw'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import ExampleBasic from './1-basic/BasicExample'
import CustomComponentsExample from './10-custom-components/CustomComponentsExample'
import UserPresenceExample from './11-user-presence/UserPresenceExample'
import ExampleApi from './2-api/APIExample'
import CustomConfigExample from './3-custom-config/CustomConfigExample'
import CustomUiExample from './4-custom-ui/CustomUiExample'
import ExplodedExample from './5-exploded/ExplodedExample'
import ExampleScroll from './6-scroll/ScrollExample'
import ExampleMultiple from './7-multiple/MultipleExample'
import ErrorBoundaryExample from './8-error-boundaries/ErrorBoundaryExample'
import HideUiExample from './9-hide-ui/HideUiExample'
import './index.css'

const router = createBrowserRouter([
	{
		path: '/',
		element: <ExampleBasic />,
	},
	{
		path: '/scroll',
		element: <ExampleScroll />,
	},
	{
		path: '/multiple',
		element: <ExampleMultiple />,
	},
	{
		path: '/api',
		element: <ExampleApi />,
	},
	{
		path: '/custom',
		element: <CustomConfigExample />,
	},
	{
		path: '/custom-ui',
		element: <CustomUiExample />,
	},
	{
		path: '/exploded',
		element: <ExplodedExample />,
	},
	{
		path: '/hide-ui',
		element: <HideUiExample />,
	},
	{
		path: '/error-boundary',
		element: <ErrorBoundaryExample />,
	},
	{
		path: '/custom-components',
		element: <CustomComponentsExample />,
	},
	{
		path: '/user-presence',
		element: <UserPresenceExample />,
	},
])

const rootElement = document.getElementById('root')
const root = createRoot(rootElement!)

root.render(
	<StrictMode>
		<ErrorBoundary
			fallback={(error) => <DefaultErrorFallback error={error} />}
			onError={(error) => console.error(error)}
		>
			<RouterProvider router={router} />
		</ErrorBoundary>
	</StrictMode>
)
