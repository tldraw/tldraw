import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Tldraw } from 'tldraw'

// Milestone 1: prove the package boots and that `tldraw` resolves to source.
// Importing `Tldraw` forces Vite to compile the SDK from `packages/tldraw/src`;
// reporting its type confirms the workspace edge is live without booting an editor.
function App() {
	return (
		<main className="playground">
			<h1>tldraw component playground</h1>
			<p>
				SDK source resolved: <code>Tldraw</code> is a {typeof Tldraw}.
			</p>
		</main>
	)
}

const root = document.getElementById('root')
if (!root) throw new Error('missing #root element')

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>
)
