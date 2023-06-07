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
	// {
	// 	path: '/scroll',
	// 	element: <ExampleScroll />,
	// },
	// {
	// 	path: '/multiple',
	// 	element: <ExampleMultiple />,
	// },
	// {
	// 	path: '/api',
	// 	element: <ExampleApi />,
	// },
	// {
	// 	path: '/custom-config',
	// 	element: <CustomConfigExample />,
	// },
	// {
	// 	path: '/custom-ui',
	// 	element: <CustomUiExample />,
	// },
	// {
	// 	path: '/exploded',
	// 	element: <ExplodedExample />,
	// },
	// {
	// 	path: '/hide-ui',
	// 	element: <HideUiExample />,
	// },
	// {
	// 	path: '/error-boundary',
	// 	element: <ErrorBoundaryExample />,
	// },
	// {
	// 	path: '/custom-components',
	// 	element: <CustomComponentsExample />,
	// },
	// {
	// 	path: '/ui-events',
	// 	element: <UiEventsExample />,
	// },
	// {
	// 	path: '/store-events',
	// 	element: <StoreEventsExample />,
	// },
	// {
	// 	path: '/user-presence',
	// 	element: <UserPresenceExample />,
	// },
	// {
	// 	path: '/zones',
	// 	element: <ZonesExample />,
	// },
	// {
	// 	path: '/persistence',
	// 	element: <PersistenceExample />,
	// },
	// {
	// 	path: '/end-to-end',
	// 	element: <EndToEnd />,
	// },
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
