import 'tldraw/tldraw.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CanvasStudio } from './canvas-studio'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root element')

createRoot(root).render(
	<StrictMode>
		<CanvasStudio />
	</StrictMode>
)
