import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { SpeechBubbleUtil } from './SpeechBubble/SpeechBubble'
import { SpeechBubbleTool } from './SpeechBubble/SpeechBubbleTool'
import { customAssetUrls, uiOverrides } from './SpeechBubble/ui-overrides'
import './speechbubble.css'

const shapeUtils = [SpeechBubbleUtil]
const tools = [SpeechBubbleTool]

export default function CustomShapeWithHandles() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				shapeUtils={shapeUtils}
				tools={tools}
				overrides={uiOverrides}
				assetUrls={customAssetUrls}
				persistenceKey="whatever"
			/>
		</div>
	)
}
