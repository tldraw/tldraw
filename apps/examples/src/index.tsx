import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import {
	DefaultErrorFallback,
	ErrorBoundary,
	setDefaultEditorAssetUrls,
	setDefaultUiAssetUrls,
} from 'tldraw'
import { ExamplePage } from './ExamplePage'
import { examples } from './examples'
import Develop from './misc/develop'
import EndToEnd from './misc/end-to-end'

// This example is only used for end to end tests

// we use secret internal `setDefaultAssetUrls` functions to set these at the
// top-level so assets don't need to be passed down in every single example.
const assetUrls = getAssetUrlsByMetaUrl()
// eslint-disable-next-line local/no-at-internal
setDefaultEditorAssetUrls(assetUrls)
// eslint-disable-next-line local/no-at-internal
setDefaultUiAssetUrls(assetUrls)
const gettingStartedExamples = examples.find((e) => e.id === 'Getting started')
if (!gettingStartedExamples) throw new Error('Could not find getting started exmaples')
const basicExample = gettingStartedExamples.value.find((e) => e.title === 'Tldraw component')
if (!basicExample) throw new Error('Could not find initial example')

const router = createBrowserRouter([
	{
		path: '*',
		lazy: async () => ({ element: <div>404</div> }),
	},
	{
		path: '/',
		lazy: async () => {
			const Component = await basicExample.loadComponent()
			return {
				element: (
					<ExamplePage example={basicExample}>
						<Component />
					</ExamplePage>
				),
			}
		},
	},
	{
		path: 'develop',
		lazy: async () => ({ element: <Develop /> }),
	},
	{
		path: 'end-to-end',
		lazy: async () => ({ element: <EndToEnd /> }),
	},
	...examples.flatMap((exampleArray) =>
		exampleArray.value.flatMap((example) => [
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
		])
	),
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
