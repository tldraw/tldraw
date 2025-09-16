import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { Room } from './pages/Room'
import { Root } from './pages/Root'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Root />} />
				<Route path="/:roomId" element={<Room />} />
			</Routes>
		</BrowserRouter>
	</React.StrictMode>
)
