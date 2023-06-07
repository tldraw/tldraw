import { BaseBoxShapeTool } from '../../../tools/BaseBoxShapeTool/BaseBoxShapeTool'

export class FrameShapeTool extends BaseBoxShapeTool {
	static override id = 'frame'
	static initial = 'idle'

	shapeType = 'frame'
}
