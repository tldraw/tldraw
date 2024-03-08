import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { SpeechBubbleTool } from './SpeechBubble/SpeechBubbleTool'
import { SpeechBubbleUtil } from './SpeechBubble/SpeechBubbleUtil'
import { components, customAssetUrls, uiOverrides } from './SpeechBubble/ui-overrides'
import './customhandles.css'

// There's a guide at the bottom of this file!

// [1]
const shapeUtils = [SpeechBubbleUtil]
const tools = [SpeechBubbleTool]

// [2]
export default function CustomShapeWithHandles() {
	return (
		<div style={{ position: 'absolute', inset: 0 }}>
			<Tldraw
				shapeUtils={shapeUtils}
				tools={tools}
				overrides={uiOverrides}
				assetUrls={customAssetUrls}
				components={components}
				persistenceKey="whatever"
			/>
		</div>
	)
}

/*
Introduction:

This example shows how to create a custom shape using handles. You can use handles when you want
user interaction to alter the geometry of a shape. In this example, we create a speech bubble shape
with a handle on the tail so the user can alter its position and length. Most of the interesting stuff
is in SpeechBubbleUtil.tsx and helpers.tsx. 

[1]
We define an array to hold the custom shape util and cusom tool. It's important to do this outside of
any React component so that this array doesn't get redefined on every render. We'll pass this into the 
Tldraw component's `shapeUtils` and `tools` props.

Check out SpeechBubbleUtil.tsx and SpeechBubbleTool.tsx to see how we define the shape util and tool.

[2]
We pass the custom shape util and tool into the Tldraw component's `shapeUtils` and `tools` props.
We also pass in the custom ui overrides and asset urls to make sure our icons render where we want them to. 
Check out ui-overrides.ts for more details.

*/
