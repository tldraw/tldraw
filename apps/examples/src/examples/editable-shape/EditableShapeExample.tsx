import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { EditableShapeUtil } from './EditableShapeUtil'

const customShapeUtils = [EditableShapeUtil]

export default function EditableShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom shape classes
				shapeUtils={customShapeUtils}
				// Create a shape when the editor mounts
				onMount={(editor) => {
					editor.createShape({ type: 'my-editable-shape', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}

/*
Introduction:

In Tldraw shapes can exist in an editing state. When shapes are in the editing state
they are focused and can't be dragged, resized or rotated. Shapes enter this state 
when they are double-clicked. In our default shapes we mostly use this for editing text. 
In this example we'll create a shape that renders an emoji and allows the user to change 
the emoji when the shape is in the editing state.

Most of the relevant code for this is in the EditableShapeUtil.tsx file. If you want a more
in-depth explanation of the shape util, check out the custom shape example.


 */
