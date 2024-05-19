import { BaseBoxShapeTool } from 'tldraw'

export class SlideShapeTool extends BaseBoxShapeTool {
	static override id = 'slide'
	static override initial = 'idle'
	override shapeType = 'slide'
}
