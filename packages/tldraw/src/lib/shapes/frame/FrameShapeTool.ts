import { BaseBoxShapeTool } from '../../editor'

export class FrameShapeTool extends BaseBoxShapeTool {
	static override id = 'frame'
	static override initial = 'idle'
	override shapeType = 'frame'
}
