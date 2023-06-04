import { TLStyleType } from '@tldraw/tlschema'
import { BaseBoxTool } from '../BaseBoxTool/BaseBoxTool'

export class FrameTool extends BaseBoxTool {
	static override id = 'frame'
	static initial = 'idle'

	shapeType = 'frame'

	styles = ['opacity'] as TLStyleType[]
}
