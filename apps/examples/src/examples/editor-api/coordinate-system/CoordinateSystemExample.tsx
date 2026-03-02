import { useEffect, useState } from 'react'
import { Tldraw, TLEditorComponents, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './coordinate-system.css'

// [1]
const CoordinateDebugPanel = track(() => {
	const editor = useEditor()
	const [mouseScreen, setMouseScreen] = useState({ x: 0, y: 0 })
	const [mousePage, setMousePage] = useState({ x: 0, y: 0 })
	const [mouseViewport, setMouseViewport] = useState({ x: 0, y: 0 })

	// [2]
	useEffect(() => {
		const handlePointerMove = (e: PointerEvent) => {
			const screenPoint = { x: e.clientX, y: e.clientY }
			const pagePoint = editor.screenToPage(screenPoint)
			const viewportPoint = editor.pageToViewport(pagePoint)

			setMouseScreen(screenPoint)
			setMousePage(pagePoint)
			setMouseViewport(viewportPoint)
		}

		const container = editor.getContainer()
		container.addEventListener('pointermove', handlePointerMove)

		return () => {
			container.removeEventListener('pointermove', handlePointerMove)
		}
	}, [editor])

	// [3]
	const viewportScreenBounds = editor.getViewportScreenBounds()
	const viewportPageBounds = editor.getViewportPageBounds()

	return (
		<div className="coordinate-debug-panel">
			<h3>Coordinate Systems</h3>

			<div className="coordinate-section">
				<h4>Mouse Position</h4>
				<div className="coordinate-row">
					<span className="coordinate-label">Screen:</span>
					<span className="coordinate-value">
						({mouseScreen.x.toFixed(0)}, {mouseScreen.y.toFixed(0)})
					</span>
				</div>
				<div className="coordinate-row">
					<span className="coordinate-label">Page:</span>
					<span className="coordinate-value">
						({mousePage.x.toFixed(0)}, {mousePage.y.toFixed(0)})
					</span>
				</div>
				<div className="coordinate-row">
					<span className="coordinate-label">Viewport:</span>
					<span className="coordinate-value">
						({mouseViewport.x.toFixed(0)}, {mouseViewport.y.toFixed(0)})
					</span>
				</div>
			</div>

			{/* [4] */}
			<div className="coordinate-section">
				<h4>Viewport Bounds</h4>
				<div className="coordinate-row">
					<span className="coordinate-label">Screen:</span>
					<span className="coordinate-value">
						({viewportScreenBounds.x.toFixed(0)}, {viewportScreenBounds.y.toFixed(0)},{' '}
						{viewportScreenBounds.w.toFixed(0)}×{viewportScreenBounds.h.toFixed(0)})
					</span>
				</div>
				<div className="coordinate-row">
					<span className="coordinate-label">Page:</span>
					<span className="coordinate-value">
						({viewportPageBounds.x.toFixed(0)}, {viewportPageBounds.y.toFixed(0)},{' '}
						{viewportPageBounds.w.toFixed(0)}×{viewportPageBounds.h.toFixed(0)})
					</span>
				</div>
			</div>
		</div>
	)
})

// [5]
const SelectedShapeOverlay = track(() => {
	const editor = useEditor()
	const selectedShapeIds = editor.getSelectedShapeIds()

	if (selectedShapeIds.length !== 1) return null

	const selectedShapeId = selectedShapeIds[0]
	const shape = editor.getShape(selectedShapeId)
	if (!shape) return null

	const pageBounds = editor.getShapePageBounds(selectedShapeId)
	if (!pageBounds) return null

	// [6]
	const topLeftViewport = editor.pageToViewport({ x: pageBounds.x, y: pageBounds.y })

	return (
		<div
			className="shape-overlay"
			style={{
				left: topLeftViewport.x,
				top: topLeftViewport.y - 32,
			}}
		>
			Page: ({pageBounds.x.toFixed(0)}, {pageBounds.y.toFixed(0)})
		</div>
	)
})

// [7]
const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => (
		<>
			<CoordinateDebugPanel />
			<SelectedShapeOverlay />
		</>
	),
}

export default function RequestCoordinateSystemTransformationsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="coordinate-transformations" components={components} />
		</div>
	)
}

/*
Introduction:

This example demonstrates tldraw's coordinate system transformations. The editor uses three
coordinate systems: screen space (browser pixels), page space (infinite canvas), and viewport space
(relative to the editor container). Understanding these transformations is essential for custom
tools, UI overlays, and interactive features.

[1]
The `CoordinateDebugPanel` displays real-time coordinate information. We use `track` to make it
reactive to editor state changes, ensuring it updates when the camera moves or zooms.

[2]
We track mouse movement to demonstrate coordinate transformations. For each pointer move:
- Screen coordinates come from the DOM event (clientX, clientY)
- Page coordinates are computed using `screenToPage()` - accounting for pan and zoom
- Viewport coordinates are computed using `pageToViewport()` - relative to the editor container

[3]
We also display the viewport bounds in both coordinate systems using `getViewportScreenBounds()`
and `getViewportPageBounds()`. These methods show the visible area of the canvas in screen and
page coordinates respectively. Watch how the screen bounds stay constant while page bounds change
as you pan and zoom the canvas.

[4]
The viewport bounds display shows position (x, y) and size (w×h) for both coordinate systems.
This is useful for visibility checks, culling, and understanding what portion of the infinite
canvas is currently visible.

[5]
The `SelectedShapeOverlay` demonstrates `pageToScreen()` by positioning a DOM element above
the selected shape. This component tracks editor state to update when selection or camera changes.

[6]
We convert the shape's page position to viewport coordinates using `pageToViewport()`. This is the
correct transformation for positioning DOM elements inside `InFrontOfTheCanvas`, which is positioned
relative to the editor container (not the browser window). Using `pageToScreen()` here would cause
the overlay to be displaced when the editor has an offset from the browser origin (e.g., a sidebar).

[7]
We use the `InFrontOfTheCanvas` component slot to render our UI. Components here are positioned
in screen space - they don't scale with zoom but maintain their screen position.
*/
