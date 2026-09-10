import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { myInteractiveShape } from './my-interactive-shape-util'

// There's a guide at the bottom of this file!

// [1]
const customShapeUtils = [myInteractiveShape]

export default function InteractiveShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					editor.createShape({ type: 'my-interactive-shape', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}

/*
[1]
The shape util array is defined outside the component so it keeps the same identity across
renders. See my-interactive-shape-util.tsx for the shape itself, which shows how to let a
shape handle its own pointer events (a checkbox and a text input) without the editor
selecting or dragging it.
*/
