import { BaseBoxShapeTool } from '@tldraw/tldraw'
export class MyShapeTool extends BaseBoxShapeTool {
	static override id = 'MyShape'
	static override initial = 'idle'
	override shapeType = 'MyShape'
}

/*
This file contains our custom tool. The tool is a StateNode with the `id` "MyShape".

We get a lot of functionality for free by extending the BaseBoxShapeTool. but we can
handle events in our own way by overriding methods like onDoubleClick. For an example 
of a tool with more custom functionality, check out the screenshot-tool example. 

*/
