import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

import { MyShapeTool } from './my-shape/MyShapeTool'
import { MyShapeUtil } from './my-shape/MyShapeUtil'
import { components, uiOverrides } from './ui-overrides'

// There's a guide at the bottom of this file!

// [1]
const customShapeUtils = [MyShapeUtil]
const customTools = [MyShapeTool]

// [2]
export default function ShapeWithMigrationsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom shape classes
				shapeUtils={customShapeUtils}
				// Pass in the array of custom tool classes
				tools={customTools}
				// Pass in any overrides to the user interface
				overrides={uiOverrides}
				// Pass in the new Keyboard Shortcuts component
				components={components}
				persistenceKey="shape-with-migrations-example"
			/>
		</div>
	)
}

/* 
Introduction:

This example shows how to create a custom shape, and add your own icon for it to the toolbar.
Check out MyShapeUtil.tsx and MyShapeTool.tsx to see how we define the shape util and tool. 
Check out ui-overrides.ts for more info on how to add your icon to the toolbar.

[1] 
We define an array to hold the custom shape util and custom tool. It's important to do this outside of
any React component so that this array doesn't get redefined on every render.

[2]
Now we'll pass these arrays into the Tldraw component's props, along with our ui overrides.


*/
