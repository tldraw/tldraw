import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { DropZoneShapeUtil } from './drop-zone-shape-util'
import './drop-zone-shape.css'

// There's a guide at the bottom of this file!

// [1]
const customShapeUtils = [DropZoneShapeUtil]

export default function DropZoneShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					editor.createShape({ type: 'drop-zone', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}

/*
[1]
The shape util array is defined outside the component so it keeps the same identity across
renders. See drop-zone-shape-util.tsx for the shape itself, which shows how to let a shape
accept dropped files instead of the canvas.
*/
