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
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				tools={tools}
				overrides={uiOverrides}
				assetUrls={customAssetUrls}
				components={components}
				persistenceKey="speech-bubble-example"
			/>
		</div>
	)
}

/*
Use handles when you want user interaction to alter the geometry of a shape. Here a speech bubble
has a handle on the tail so the user can move it. Most of the interesting code is in
SpeechBubbleUtil.tsx and helpers.tsx.

[1]
The custom shape util and tool arrays are defined outside of any React component so they don't get
redefined on every render. See SpeechBubbleUtil.tsx and SpeechBubbleTool.tsx for the definitions.

[2]
We pass the shape util and tool into the Tldraw component's `shapeUtils` and `tools` props, plus the
UI overrides, components, and asset urls that add the tool to the toolbar with its own icon. See
ui-overrides.tsx for details.
*/
