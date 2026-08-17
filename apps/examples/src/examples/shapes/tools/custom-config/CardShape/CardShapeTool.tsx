import { BaseBoxShapeTool } from 'tldraw'
export class CardShapeTool extends BaseBoxShapeTool {
	static override id = 'card'
	static override initial = 'idle'
	override shapeType = 'card' as const
}

/*
This file contains our custom tool. The tool is a StateNode with the `id` "card".

We get click-to-create and drag-to-create for free by extending BaseBoxShapeTool, but we
could handle events in our own way by overriding methods like onDoubleClick. For an example
of a tool with more custom functionality, check out the screenshot-tool example.
*/
