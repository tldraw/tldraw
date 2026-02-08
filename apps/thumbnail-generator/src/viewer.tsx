import ReactDOM from 'react-dom/client'
import { Editor, loadSnapshot, Tldraw, TLEditorSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'

// Expose APIs on window for Playwright to call
declare global {
	interface Window {
		__tldraw_editor: Editor | null
		__tldraw_ready: boolean
		__tldraw_loadSnapshot: (
			snapshot: Partial<TLEditorSnapshot>,
			opts?: { pageId?: string; bounds?: { x: number; y: number; w: number; h: number } }
		) => void
	}
}

window.__tldraw_editor = null
window.__tldraw_ready = false

function Viewer() {
	return (
		<div style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0 }}>
			<Tldraw
				hideUi
				onMount={(editor) => {
					// Expose editor for Playwright
					window.__tldraw_editor = editor

					// Expose a function to load a snapshot and configure the view
					window.__tldraw_loadSnapshot = (snapshot, opts) => {
						loadSnapshot(editor.store, snapshot)

						// Switch to a specific page if requested
						if (opts?.pageId) {
							const page = editor.getPages().find((p) => p.id === opts.pageId)
							if (page) {
								editor.setCurrentPage(page.id)
							}
						}

						if (opts?.bounds && opts.bounds.w > 0 && opts.bounds.h > 0) {
							// Set camera to show specific bounds
							const { x, y, w, h } = opts.bounds
							const viewportW = editor.getViewportScreenBounds().width
							const viewportH = editor.getViewportScreenBounds().height
							const zoom = Math.min(viewportW / w, viewportH / h)
							editor.setCamera(
								{
									x: -x + (viewportW / zoom - w) / 2,
									y: -y + (viewportH / zoom - h) / 2,
									z: zoom,
								},
								{ force: true }
							)
						} else {
							// Zoom to fit all content
							editor.zoomToFit({ force: true })

							// If there's no content, just reset zoom
							if (editor.getCurrentPageShapeIds().size === 0) {
								editor.resetZoom(undefined, { force: true })
							}
						}
					}

					window.__tldraw_ready = true
				}}
			/>
		</div>
	)
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Viewer />)
