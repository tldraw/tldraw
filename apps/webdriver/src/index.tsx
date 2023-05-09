import { DefaultErrorFallback, ErrorBoundary } from '@tldraw/tldraw'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import ExampleBasic from './1-basic/BasicExampleWebdriver'
import './index.css'

const router = createBrowserRouter([
	{
		path: '/',
		element: <ExampleBasic />,
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
