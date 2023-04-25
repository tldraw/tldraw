import { TLStyleType } from '@tldraw/tlschema'
import { TLBoxTool } from '../TLBoxTool/TLBoxTool'

export class TLFrameTool extends TLBoxTool {
	static override id = 'frame'
	static initial = 'idle'

	shapeType = 'frame'

	styles = ['opacity'] as TLStyleType[]
}
