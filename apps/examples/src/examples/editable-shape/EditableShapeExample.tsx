import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { MyShapeTool } from './my-shape/my-shape-tool'
import { MyShapeUtil } from './my-shape/my-shape-util'
import { uiOverrides } from './ui-overrides'

// [1]
const customShapeUtils = [MyShapeUtil]
const customTools = [MyShapeTool]

//[2]
export default function EditableShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom shape classes
				shapeUtils={customShapeUtils}
				// Pass in the array of custom tools
				tools={customTools}
				// Pass in any overrides to the user interface
				overrides={uiOverrides}
			/>
		</div>
	)
}

/*
Introduction:
In Tldraw shapes can exist in an editing state. When shapes are in the editing state
they are focused and can't be dragged, resized or rotated. Shapes are edited when they
are double-clicked, so users can still drag and resize shapes without accidentally 
entering the editing state. In our default shapes we mostly use this for editing text, 
but it's also used in our video shape. In this example we'll create a shape that you 
could use for a game of Go, but instead of black and white stones, we'll use cats and 
dogs.

Most of the relevant code is in the my-shape-util.tsx file.

[1]
We have to define our array of custom shapes and tools outside of the component. So it
doesn't get redefined every time the component re-renders. We'll pass that in to the 
editors props.

[2]
We pass in our custom shape classes to the Tldraw component as props. We also pass in
any uiOverrides we want to use, this is to make sure that our custom tool appears on 
the toolbar. 

 */
