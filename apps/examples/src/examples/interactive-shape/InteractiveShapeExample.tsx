import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

import { MyShapeTool } from './my-shape/my-shape-tool'
import { MyShapeUtil } from './my-shape/my-shape-util'
import snapshot from './snapshot.json'
import { components, uiOverrides } from './ui-overrides'

// There's a guide at the bottom of this file!

// [1]
const customShapeUtils = [MyShapeUtil]
const customTools = [MyShapeTool]

//[2]
export default function InteractiveShapeExample() {
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
				snapshot={snapshot}
			/>
		</div>
	)
}

/*
Introduction:

By default the editor handles pointer events, but sometimes you want to handle 
interactions on your shape in your own ways, for example via a button. You can do this 
by using the css property `pointer events: all` and stopping event propagation. In 
this example we want our todo shape to have a checkbox so the user can mark them as 
done.

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
