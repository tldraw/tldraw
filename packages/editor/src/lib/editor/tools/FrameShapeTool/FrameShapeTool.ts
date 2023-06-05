import { TLStyleType } from '@tldraw/tlschema'
import { BaseBoxShapeTool } from '../BaseBoxShapeTool/BaseBoxShapeTool'

export class FrameShapeTool extends BaseBoxShapeTool {
	static override id = 'frame'
	static initial = 'idle'

	shapeType = 'frame'

	styles = ['opacity'] as TLStyleType[]
}
