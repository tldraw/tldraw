import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import {
	DefaultErrorFallback,
	ErrorBoundary,
	setDefaultEditorAssetUrls,
	setDefaultUiAssetUrls,
} from '@tldraw/tldraw'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { ExamplePage } from './ExamplePage'
import { HomePage } from './HomePage'
import { examples } from './examples'
import EndToEnd from './testing/end-to-end'

// This example is only used for end to end tests

// we use secret internal `setDefaultAssetUrls` functions to set these at the
// top-level so assets don't need to be passed down in every single example.
const assetUrls = getAssetUrlsByMetaUrl()
setDefaultEditorAssetUrls(assetUrls)
setDefaultUiAssetUrls(assetUrls)

const router = createBrowserRouter([
	{
		path: '/',
		element: <HomePage />,
	},
	{
		path: 'end-to-end',
		element: <EndToEnd />,
	},
	...examples.flatMap((example) => [
		{
			path: example.path,
			lazy: async () => {
				const Component = await example.loadComponent()
				return {
					element: (
						<ExamplePage example={example}>
							<Component />
						</ExamplePage>
					),
				}
			},
		},
		{
			path: `${example.path}/full`,
			lazy: async () => {
				const Component = await example.loadComponent()
				return {
					element: <Component />,
				}
			},
		},
	]),
])

document.addEventListener('DOMContentLoaded', () => {
	const rootElement = document.getElementById('root')!
	const root = createRoot(rootElement!)
	root.render(
		<ErrorBoundary
			fallback={(error) => <DefaultErrorFallback error={error} />}
			onError={(error) => console.error(error)}
		>
			<RouterProvider router={router} />
		</ErrorBoundary>
	)
})
