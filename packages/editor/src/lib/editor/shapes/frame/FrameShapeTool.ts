import { BaseBoxShapeTool } from '../../tools/BaseBoxShapeTool/BaseBoxShapeTool'
import { FrameShapeUtil } from './FrameShapeUtil'

export class FrameShapeTool extends BaseBoxShapeTool {
	static override id = 'frame'
	static initial = 'idle'

	shapeType = FrameShapeUtil
}
