import { useState } from 'react'
import { Tldraw, TLEditorComponents, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './things-on-the-canvas.css'

// There's a guide at the bottom of this file!

// [1]
function MyComponent() {
	const [state, setState] = useState(0)
	const editor = useEditor()

	return (
		<>
			<div
				className="on-the-canvas-card"
				style={{ top: 50, left: 50, backgroundColor: 'goldenrod' }}
				onPointerDown={editor.markEventAsHandled}
			>
				<p>The count is {state}! </p>
				<button onClick={() => setState((s) => s - 1)}>-1</button>
				<p>These components are on the canvas. They will scale with camera zoom like shapes.</p>
			</div>
			<div
				className="on-the-canvas-card"
				style={{ top: 210, left: 150, backgroundColor: 'pink' }}
				onPointerDown={editor.markEventAsHandled}
			>
				<p>The count is {state}! </p>
				<button onClick={() => setState((s) => s + 1)}>+1</button>
				<p>Create and select a shape to see the in front of the canvas component</p>
			</div>
		</>
	)
}

// [2]
function MyComponentInFront() {
	const editor = useEditor()
	const position = useValue(
		'selection position',
		() => {
			const bounds = editor.getSelectionRotatedPageBounds()
			if (!bounds) return null
			return editor.pageToViewport(bounds.point)
		},
		[editor]
	)
	if (!position) return null

	return (
		<div
			className="in-front-of-the-canvas-card"
			style={{ top: Math.max(64, position.y - 64), left: Math.max(64, position.x) }}
		>
			<p>This won’t scale with zoom.</p>
		</div>
	)
}

// [3]
const components: TLEditorComponents = {
	OnTheCanvas: MyComponent,
	InFrontOfTheCanvas: MyComponentInFront,
}

export default function OnTheCanvasExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="things-on-the-canvas-example" components={components} />
		</div>
	)
}

/*
This example shows the two component slots that live inside the canvas:
`OnTheCanvas` and `InFrontOfTheCanvas`. `OnTheCanvas` components behave like
shapes: they scale with the zoom and move when the page is panned.
`InFrontOfTheCanvas` components render in screen space, so they move with the
page but don't scale.

For a component that ignores the camera entirely, put it in a UI slot such as
`TopPanel` or `SharePanel` instead (see the "UI zones" example).

[1]
Our `OnTheCanvas` component. Its `top`/`left` are page coordinates. We call
`editor.markEventAsHandled` on pointer down so clicks on the card don't also
reach the canvas and start a selection or brush.

[2]
Our `InFrontOfTheCanvas` component. We want it to sit next to the selection,
so we read the selection bounds inside `useValue`; the component re-renders
whenever the selection or the camera changes. `editor.pageToViewport` converts
the page-space point into viewport (screen) coordinates.

[3]
Define the components object once at module level, so `<Tldraw>` doesn't see a
new object on every render.
*/
