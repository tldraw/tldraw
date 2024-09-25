import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'

const router = createBrowserRouter([
	{
		path: '*',
		lazy: async () => ({ element: <div>404</div> }),
	},
	{
		path: '/',
		lazy: async () => await import('./routes/root'),
	},
	{
		path: '/file/:fileId',
		lazy: async () => await import('./routes/file'),
	},
])

document.addEventListener('DOMContentLoaded', () => {
	const rootElement = document.getElementById('root')!
	const root = createRoot(rootElement!)
	root.render(<RouterProvider router={router} />)
})
