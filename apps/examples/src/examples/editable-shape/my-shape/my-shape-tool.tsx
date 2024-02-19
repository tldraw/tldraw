import { BaseBoxShapeTool } from '@tldraw/tldraw'
export class CatDogTool extends BaseBoxShapeTool {
	static override id = 'catdog'
	static override initial = 'idle'
	override shapeType = 'catdog'
}

/*
This file contains our custom tool. The tool is a StateNode with the `id` "catdog".

We get a lot of functionality for free by extending the BaseBoxShapeTool. but we can
handle events in our own way by overriding methods like onDoubleClick. For an example 
of a tool with more custom functionality, check out the screenshot-tool example. 

*/
