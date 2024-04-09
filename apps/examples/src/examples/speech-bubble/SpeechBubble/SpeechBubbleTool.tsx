import { BaseBoxShapeTool } from 'tldraw'

export class SpeechBubbleTool extends BaseBoxShapeTool {
	static override id = 'speech-bubble'
	static override initial = 'idle'
	override shapeType = 'speech-bubble'
}

/*
This file contains our speech bubble tool. The tool is a StateNode with the `id` "speech-bubble".

We get a lot of functionality for free by extending the BaseBoxShapeTool. For an example of a tool
with more custom functionality, check out the screenshot-tool example. 

*/
