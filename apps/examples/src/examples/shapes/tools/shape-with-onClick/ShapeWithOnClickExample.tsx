import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { ClickableShapeUtil } from './ClickableShapeUtil'

// [1]
const customShapeUtils = [ClickableShapeUtil]

// [2]
export default function ShapeWithOnClickExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					editor.createShape({
						type: 'clickable',
						x: 200,
						y: 200,
					})
				}}
			/>
		</div>
	)
}

/*
[1]
We define the custom shape utils array outside of the component so it doesn't get recreated
on every render.

[2]
We pass our custom shape util to the Tldraw component and create an initial shape on mount
so there's something to interact with right away.

Try it:
- Click the shape to increment the counter
- Drag the shape to move it
- Both work on unselected and selected shapes
*/
