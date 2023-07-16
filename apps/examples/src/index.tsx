import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { DefaultErrorFallback, ErrorBoundary, setDefaultUiAssetUrls } from '@tldraw/tldraw'
import { setDefaultEditorAssetUrls } from '@tldraw/tldraw/src/lib/utils/assetUrls'
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
import CustomStylesExample from './16-custom-styles/CustomStylesExample'
import ShapeMetaExample from './17-shape-meta/ShapeMetaExample'
import ExampleApi from './2-api/APIExample'
import CustomConfigExample from './3-custom-config/CustomConfigExample'
import CustomUiExample from './4-custom-ui/CustomUiExample'
import ExplodedExample from './5-exploded/ExplodedExample'
import ExampleScroll from './6-scroll/ScrollExample'
import ExampleMultiple from './7-multiple/MultipleExample'
import ErrorBoundaryExample from './8-error-boundary/ErrorBoundaryExample'
import HideUiExample from './9-hide-ui/HideUiExample'
import ExamplesTldrawLogo from './ExamplesTldrawLogo'
import { ListLink } from './components/ListLink'
import EndToEnd from './end-to-end/end-to-end'
import YjsExample from './yjs/YjsExample'

// This example is only used for end to end tests

// we use secret internal `setDefaultAssetUrls` functions to set these at the
// top-level so assets don't need to be passed down in every single example.
const assetUrls = getAssetUrlsByMetaUrl()
setDefaultEditorAssetUrls(assetUrls)
setDefaultUiAssetUrls(assetUrls)

type Example = {
	path: string
	title?: string
	element: JSX.Element
}

export const allExamples: Example[] = [
	{
		title: 'Basic (development)',
		path: '/develop',
		element: <ExampleBasic />,
	},
	{
		title: 'Editor API',
		path: '/api',
		element: <ExampleApi />,
	},
	{
		title: 'Multiple editors',
		path: '/multiple',
		element: <ExampleMultiple />,
	},
	{
		title: 'Scroll example',
		path: '/scroll',
		element: <ExampleScroll />,
	},
	{
		title: 'Custom config',
		path: '/custom-config',
		element: <CustomConfigExample />,
	},
	{
		title: 'Sublibraries',
		path: '/exploded',
		element: <ExplodedExample />,
	},
	{
		title: 'Error boundary',
		path: '/error-boundary',
		element: <ErrorBoundaryExample />,
	},
	{
		title: 'Custom UI',
		path: '/custom-ui',
		element: <CustomUiExample />,
	},
	{
		title: 'Hide UI',
		path: '/hide-ui',
		element: <HideUiExample />,
	},
	{
		title: 'UI components',
		path: '/custom-components',
		element: <CustomComponentsExample />,
	},
	{
		title: 'UI events',
		path: '/ui-events',
		element: <UiEventsExample />,
	},
	{
		title: 'Store events',
		path: '/store-events',
		element: <StoreEventsExample />,
	},
	{
		title: 'User presence',
		path: '/user-presence',
		element: <UserPresenceExample />,
	},
	{
		title: 'UI zones',
		path: '/zones',
		element: <ZonesExample />,
	},
	{
		title: 'Persistence',
		path: '/persistence',
		element: <PersistenceExample />,
	},
	{
		title: 'Custom styles',
		path: '/yjs',
		element: <YjsExample />,
	},
	{
		title: 'Custom styles',
		path: '/custom-styles',
		element: <CustomStylesExample />,
	},
	{
		title: 'Shape meta property',
		path: '/shape-meta',
		element: <ShapeMetaExample />,
	},
	// not listed
	{
		path: '/end-to-end',
		element: <EndToEnd />,
	},
]

function App() {
	return (
		<div className="examples">
			<div className="examples__header">
				<ExamplesTldrawLogo />
				<p>
					See docs at <a href="https://tldraw.dev">tldraw.dev</a>
				</p>
			</div>
			<ul className="examples__list">
				{allExamples
					.filter((example) => example.title)
					.map((example) => (
						<ListLink key={example.path} title={example.title!} route={example.path} />
					))}
			</ul>
		</div>
	)
}

const router = createBrowserRouter([
	...allExamples,
	{
		path: '/',
		element: <App />,
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
