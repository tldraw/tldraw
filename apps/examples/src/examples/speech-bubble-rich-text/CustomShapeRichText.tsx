import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { SpeechBubbleTool } from '../speech-bubble/SpeechBubble/SpeechBubbleTool'
import {
	components,
	customAssetUrls,
	uiOverrides,
} from '../speech-bubble/SpeechBubble/ui-overrides'
import '../speech-bubble/customhandles.css'
import { SpeechBubbleUtilRichText } from './SpeechBubbleUtilRichText'

// There's a guide at the bottom of this file!

// [1]
const shapeUtils = [SpeechBubbleUtilRichText]
const tools = [SpeechBubbleTool]

// [2]
export default function CustomShapeRichText() {
	return (
		<div style={{ position: 'absolute', inset: 0 }}>
			<Tldraw
				shapeUtils={shapeUtils}
				tools={tools}
				overrides={uiOverrides}
				assetUrls={customAssetUrls}
				components={components}
				persistenceKey="whatever-rich-text"
			/>
		</div>
	)
}

/*
For this particular guide check out the main `speech-bubble` example.
This is the same guide except this utilizes SpeechBubbleUtilRichText to add rich text to the shape.
*/
