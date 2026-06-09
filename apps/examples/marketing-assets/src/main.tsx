import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { Root } from './Root.tsx'

const router = createBrowserRouter([
	{ path: '/', element: <Root /> },
	{ path: '/:roomId', element: <App /> },
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<RouterProvider router={router} />
)
