import { BaseBoxShapeTool } from 'tldraw'

export class SpeechBubbleTool extends BaseBoxShapeTool {
	static override id = 'speech-bubble'
	override shapeType = 'speech-bubble' as const
}

/*
The speech bubble tool is a StateNode with the id "speech-bubble". Extending BaseBoxShapeTool gives
us click-to-create and drag-to-create of a `shapeType` shape for free. For a tool with more custom
behavior, see the screenshot tool example.
*/
