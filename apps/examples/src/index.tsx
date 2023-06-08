import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import {
	DefaultErrorFallback,
	ErrorBoundary,
	setDefaultEditorAssetUrls,
	setDefaultUiAssetUrls,
} from '@tldraw/tldraw'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import ExampleBasic from './1-basic/BasicExample'
import CustomComponentsExample from './10-custom-components/CustomComponentsExample'
import UserPresenceExample from './11-user-presence/UserPresenceExample'
import UiEventsExample from './12-ui-events/UiEventsExample'
import StoreEventsExample from './13-store-events/StoreEventsExample'
import PersistenceExample from './14-persistence/PersistenceExample'
import ZonesExample from './15-custom-zones/ZonesExample'
import ExampleApi from './2-api/APIExample'
import CustomConfigExample from './3-custom-config/CustomConfigExample'
import CustomUiExample from './4-custom-ui/CustomUiExample'
import ExplodedExample from './5-exploded/ExplodedExample'
import ExampleScroll from './6-scroll/ScrollExample'
import ExampleMultiple from './7-multiple/MultipleExample'
import ErrorBoundaryExample from './8-error-boundary/ErrorBoundaryExample'
import HideUiExample from './9-hide-ui/HideUiExample'
import EndToEnd from './end-to-end/end-to-end'

// This example is only used for end to end tests

// we use secret internal `setDefaultAssetUrls` functions to set these at the
// top-level so assets don't need to be passed down in every single example.
const assetUrls = getAssetUrlsByMetaUrl()
setDefaultEditorAssetUrls(assetUrls)
setDefaultUiAssetUrls(assetUrls)

type Example = {
	path: string
	element: JSX.Element
}

export const allExamples: Example[] = [
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
		path: '/custom-config',
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
		path: '/ui-events',
		element: <UiEventsExample />,
	},
	{
		path: '/store-events',
		element: <StoreEventsExample />,
	},
	{
		path: '/user-presence',
		element: <UserPresenceExample />,
	},
	{
		path: '/zones',
		element: <ZonesExample />,
	},
	{
		path: '/persistence',
		element: <PersistenceExample />,
	},
	{
		path: '/end-to-end',
		element: <EndToEnd />,
	},
]

const router = createBrowserRouter(allExamples)
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
