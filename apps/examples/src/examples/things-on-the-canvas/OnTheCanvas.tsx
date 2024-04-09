import { useState } from 'react'
import { stopEventPropagation, Tldraw, TLEditorComponents, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
function MyComponent() {
	const [state, setState] = useState(0)

	return (
		<>
			<div
				style={{
					position: 'absolute',
					top: 50,
					left: 50,
					width: 200,
					padding: 12,
					borderRadius: 8,
					backgroundColor: 'goldenrod',
					zIndex: 0,
					userSelect: 'unset',
					boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)',
				}}
				onPointerDown={stopEventPropagation}
				onPointerMove={stopEventPropagation}
			>
				<p>The count is {state}! </p>
				<button onClick={() => setState((s) => s - 1)}>-1</button>
				<p>These components are on the canvas. They will scale with camera zoom like shapes.</p>
			</div>
			<div
				style={{
					position: 'absolute',
					top: 210,
					left: 150,
					width: 200,
					padding: 12,
					borderRadius: 8,
					backgroundColor: 'pink',
					zIndex: 99999999,
					userSelect: 'unset',
					boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)',
				}}
				onPointerDown={stopEventPropagation}
				onPointerMove={stopEventPropagation}
			>
				<p>The count is {state}! </p>
				<button onClick={() => setState((s) => s + 1)}>+1</button>
				<p>Create and select a shape to see the in front of the canvas component</p>
			</div>
		</>
	)
}

//[2]
const MyComponentInFront = track(() => {
	const editor = useEditor()
	const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds()
	if (!selectionRotatedPageBounds) return null

	const pageCoordinates = editor.pageToViewport(selectionRotatedPageBounds.point)

	return (
		<div
			style={{
				position: 'absolute',
				top: Math.max(64, pageCoordinates.y - 64),
				left: Math.max(64, pageCoordinates.x),
				borderRadius: 8,
				paddingLeft: 10,
				paddingRight: 10,
				background: '#efefef',
				boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)',
			}}
		>
			<p>This won't scale with zoom.</p>
		</div>
	)
})

// [3]
const components: TLEditorComponents = {
	OnTheCanvas: MyComponent,
	InFrontOfTheCanvas: MyComponentInFront,
}

// [4]
export default function OnTheCanvasExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="things-on-the-canvas-example" components={components} />
		</div>
	)
}

/* 
This example shows how you can use the onTheCanvas and inFrontOfTheCanvas components.
onTheCanvas components will behave similarly to shapes, they will scale with the zoom
and move when the page is panned. inFrontOfTheCanvas components don't scale with the
zoom, but still move when the page is panned. 

For another example that shows how to customize components, check out the custom
components example.

To have a component that ignores the camera entirely, you should check out the custom 
UI example.


[1]
This is our onTheCanvas component. We also stop event propagation on the pointer events 
so that we don't accidentally select shapes when interacting with the component.

[2]
This is our inFrontOfTheCanvas component. We want to render this next to a selected shape,
so we need to make sure it's reactive to changes in the editor. We use the track function
to make sure the component is re-rendered whenever the selection changes. Check out the
Signia docs for more info: https://signia.tldraw.dev/docs/API/signia_react/functions/track

Using the editor instance we can get the bounds of the selection box and convert them to
screen coordinates. We then render the component at those coordinates.


[3]
This is where we define the object that will be passed to the Tldraw component prop. 

[4]
This is where we render the Tldraw component. Let's pass the components object to the 
components prop.

*/
