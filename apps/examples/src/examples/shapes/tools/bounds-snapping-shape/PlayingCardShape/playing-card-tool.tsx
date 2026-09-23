import { BaseBoxShapeTool } from 'tldraw'
export class PlayingCardTool extends BaseBoxShapeTool {
	static override id = 'PlayingCard'
	static override initial = 'idle'
	override shapeType = 'PlayingCard' as const
}

/*
This file contains our custom tool. The tool is a StateNode with the `id` "PlayingCard".

We get click-to-create and drag-to-create for free by extending BaseBoxShapeTool, but we
could handle events in our own way by overriding methods like onDoubleClick. For an example
of a tool with more custom functionality, check out the screenshot-tool example.

*/
