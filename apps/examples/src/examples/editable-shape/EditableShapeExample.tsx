import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { MyshapeTool } from './my-shape/my-shape-tool'
import { MyshapeUtil } from './my-shape/my-shape-util'
import { components, uiOverrides } from './ui-overrides'

// [1]
const customShapeUtils = [MyshapeUtil]
const customTools = [MyshapeTool]

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
				// pass in the new Keyboard Shortcuts component
				components={components}
			/>
		</div>
	)
}

/*
Introduction:

In Tldraw shapes can exist in an editing state. When shapes are in the editing state
they are focused and can't be dragged, resized or rotated. Shapes enter this state 
when they are double-clicked, this means that users can drag and resize shapes without 
accidentally entering the editing state. In our default shapes we mostly use this for 
editing text, but it's also used in our video shape. In this example we'll create a 
shape that you could use for a game of Go, but instead of black and white stones, we'll
use cats and dogs.

Most of the relevant code for this is in the my-shape-util.tsx file. We also define a
very simple tool in my-shape-tool.tsx, and make our new tool appear on the toolbar in 
ui-overrides.ts. 

[1]
We have to define our array of custom shapes and tools outside of the component. So it
doesn't get redefined every time the component re-renders. We'll pass that in to the 
editors props.

[2]
We pass in our custom shape classes to the Tldraw component as props. We also pass in
any uiOverrides we want to use, this is to make sure that our custom tool appears on 
the toolbar. 

 */
