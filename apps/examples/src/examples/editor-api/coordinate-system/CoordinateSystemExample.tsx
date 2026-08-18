import { Tldraw, TLEditorComponents, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './coordinate-system.css'

// There's a guide at the bottom of this file!

// [1]
function CoordinateDebugPanel() {
	const editor = useEditor()

	// [2]
	const mouse = useValue(
		'mouse',
		() => {
			const page = editor.inputs.getCurrentPagePoint()
			return {
				page,
				screen: editor.pageToScreen(page),
				viewport: editor.pageToViewport(page),
			}
		},
		[editor]
	)

	// [3]
	const viewportScreenBounds = useValue('screen bounds', () => editor.getViewportScreenBounds(), [
		editor,
	])
	const viewportPageBounds = useValue('page bounds', () => editor.getViewportPageBounds(), [editor])

	return (
		<div className="coordinate-debug-panel">
			<h3>Coordinate systems</h3>

			<div className="coordinate-section">
				<h4>Mouse position</h4>
				<div className="coordinate-row">
					<span className="coordinate-label">Screen:</span>
					<span className="coordinate-value">
						({mouse.screen.x.toFixed(0)}, {mouse.screen.y.toFixed(0)})
					</span>
				</div>
				<div className="coordinate-row">
					<span className="coordinate-label">Page:</span>
					<span className="coordinate-value">
						({mouse.page.x.toFixed(0)}, {mouse.page.y.toFixed(0)})
					</span>
				</div>
				<div className="coordinate-row">
					<span className="coordinate-label">Viewport:</span>
					<span className="coordinate-value">
						({mouse.viewport.x.toFixed(0)}, {mouse.viewport.y.toFixed(0)})
					</span>
				</div>
			</div>

			<div className="coordinate-section">
				<h4>Viewport bounds</h4>
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
}

// [4]
function SelectedShapeOverlay() {
	const editor = useEditor()
	const overlay = useValue(
		'selected shape overlay',
		() => {
			const selectedShapeId = editor.getOnlySelectedShapeId()
			if (!selectedShapeId) return null
			const pageBounds = editor.getShapePageBounds(selectedShapeId)
			if (!pageBounds) return null
			// [5]
			const topLeft = editor.pageToViewport(pageBounds.point)
			return { pageBounds, topLeft }
		},
		[editor]
	)

	if (!overlay) return null

	return (
		<div
			className="shape-overlay"
			style={{
				left: overlay.topLeft.x,
				top: overlay.topLeft.y - 32,
			}}
		>
			Page: ({overlay.pageBounds.x.toFixed(0)}, {overlay.pageBounds.y.toFixed(0)})
		</div>
	)
}

// [6]
const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => (
		<>
			<CoordinateDebugPanel />
			<SelectedShapeOverlay />
		</>
	),
}

export default function CoordinateSystemExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="coordinate-transformations" components={components} />
		</div>
	)
}

/*
The editor works with three coordinate systems:

- Screen space: browser pixels, as reported by DOM events (`clientX`, `clientY`).
- Viewport space: pixels relative to the top-left of the editor's container. This is what
  you use to position DOM elements inside the editor.
- Page space: the infinite canvas that shapes live in. Panning and zooming change how page
  space maps to the other two.

`screenToPage`, `pageToScreen`, and `pageToViewport` convert between them.

[1]
A panel that prints the pointer position in each system, plus the viewport bounds. It's rendered
in the `InFrontOfTheCanvas` slot so it sits over the canvas but doesn't move with it.

[2]
`editor.inputs.getCurrentPagePoint()` is a reactive signal that updates on every pointer move, so
reading it inside `useValue` keeps the readout live. We convert it back to the other two spaces
with `pageToScreen` and `pageToViewport`. Going the other way, `screenToPage` turns a DOM event's
`clientX`/`clientY` into a page point.

[3]
`getViewportScreenBounds()` is the editor container's rectangle in screen space, so it only
changes when the container moves or resizes. `getViewportPageBounds()` is the region of the page
currently visible, so it changes whenever you pan or zoom.

[4]
A label positioned above the selected shape. `getOnlySelectedShapeId()` returns null unless
exactly one shape is selected.

[5]
Elements inside `InFrontOfTheCanvas` are positioned relative to the editor container, so we use
`pageToViewport`, not `pageToScreen`. `pageToScreen` includes the container's offset from the
browser origin, which would push the label off target whenever the editor isn't at (0, 0), for
example next to a sidebar.

[6]
Define `components` outside the React component so the slot component identity is stable across
renders.
*/
