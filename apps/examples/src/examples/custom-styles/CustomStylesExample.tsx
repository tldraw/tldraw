import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { CardShapeTool, CardShapeUtil } from './CardShape'
import { FilterStyleUi } from './FilterStyleUi'
import { components, uiOverrides } from './ui-overrides'

// There's a guide at the bottom of this file!

// [1]
const customShapeUtils = [CardShapeUtil]
const customTools = [CardShapeTool]

// [2]
export default function CustomStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-styles-example"
				shapeUtils={customShapeUtils}
				tools={customTools}
				overrides={uiOverrides}
				components={components}
			>
				<FilterStyleUi />
			</Tldraw>
		</div>
	)
}
/*
Introduction:

This example shows how to create your own custom styles to use with your shapes. 
It also shows how to create a very simple ui for your styles. In this example, we 
create a custom style for a card shape that lets the user apply a filter to blur,
invert or grayscale the card.

[1]
We define an array to hold the custom shape util and custom tool. It's important to 
do this outside of any React component so that this array doesn't get redefined on 
every render. We'll pass this into the Tldraw component's `shapeUtils` and `tools` 
props.

Check out CardShape.tsx to see how we define the shape util, tool and the custom 
style.

[2]
We pass the custom shape util and tool into the Tldraw component's `shapeUtils` and 
`tools` props. We also pass in the custom ui overrides, this will make an icon for 
our shape/tool appear on the toolbar (see ui-overrides.ts). And render our 
FilterStyleUi component inside the Tldraw component.

Check out FilterStyleUi.tsx to see how we render this Ui only when the user has 
selected a shape that uses the custom style.

*/
