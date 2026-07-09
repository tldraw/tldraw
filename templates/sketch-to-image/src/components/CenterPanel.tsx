import { TldrawUiButton, TldrawUiButtonLabel, useEditor } from 'tldraw'
import { FIGURE_PAGE_X, FIGURE_PAGE_Y } from '../background/ThreeBackground'

/**
 * The top-right panel (tldraw's `SharePanel` slot). Holds a single "Center"
 * button that resets the view: zoom back to 100% and center the viewport on the
 * figure's page-space home.
 *
 * The three.js figure lives at a fixed point in page space and tracks the
 * tldraw camera, so centering the tldraw camera on that point recenters both
 * the drawing canvas and the 3D figure in one move.
 */
export function CenterPanel() {
	const editor = useEditor()

	const center = () => {
		// Reset zoom to 100% and put the figure's page point at the viewport
		// center in one atomic move. At z=1, screen pixels equal page units, so
		// camera = viewportCenter − figurePoint (tldraw: screen = (page + cam) * z).
		const { w, h } = editor.getViewportScreenBounds()
		editor.setCamera(
			{ x: w / 2 - FIGURE_PAGE_X, y: h / 2 - FIGURE_PAGE_Y, z: 1 },
			{ animation: { duration: 200 } }
		)
	}

	return (
		<div style={{ padding: 8, pointerEvents: 'all' }}>
			<TldrawUiButton type="normal" onClick={center} title="Reset the view to center">
				<TldrawUiButtonLabel>Center</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
}
