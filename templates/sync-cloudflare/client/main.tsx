import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Room } from './pages/Room'
import { Root } from './pages/Root'

const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
	},
	{
		path: '/:roomId',
		element: <Room />,
	},
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
)
