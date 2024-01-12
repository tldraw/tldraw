import {
	stopEventPropagation,
	Tldraw,
	TLEditorComponents,
	track,
	useEditor,
	Vec,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useState } from 'react'

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

	const pageCoordinates = Vec.Sub(
		editor.pageToScreen(selectionRotatedPageBounds.point),
		editor.getViewportScreenBounds()
	)

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
	SnapLine: null,
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
zoom, but still move when the page is panned. To do this we need to use the components
prop to pass our components to the editor.

[1]
This is our component that we want to render on the canvas. We render it inside a 
div that has pointer-events: all. This will allow us to interact
with the component without selecting it. We also stop event propagation on the pointer
events so that we don't accidentally select shapes when interacting with the component.

[2]
We use the track function to wrap our component. This makes our component reactive- it will



[3]
We pass our component to the editor via the components prop. We pass it as the OnTheCanvas
component, which means it will be rendered on the canvas. We also pass it as the 
InFrontOfTheCanvas component, which means it will be rendered in front of the canvas. We
pass null as the SnapLine component, which means the editor will use the default snap line
component.

[4]
We render the Tldraw component with the persistenceKey prop. This will persist the editor
state to localStorage. We also pass our components to the Tldraw component via the
components prop. This gives us access to the editor instance via React context.

*/
