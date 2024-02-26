import { Accoutrement } from '@tldraw/tldraw'
import { DraggingSpeechBubble, SpeechBubbleHandle } from './SpeechBubbleHandle'
import { SpeechBubbleTool } from './SpeechBubbleTool'
import { SpeechBubbleUtil } from './SpeechBubbleUtil'

export const SpeechBubbleAccoutrement: Accoutrement = {
	id: 'speechBubble',
	onMount: (editor) => {
		editor.root.find('select')?.addChild(DraggingSpeechBubble)
	},
	shapeUtils: [SpeechBubbleUtil],
	tools: [SpeechBubbleTool],
	components: {
		InFrontOfTheCanvas: () => <SpeechBubbleHandle />,
	},
}
