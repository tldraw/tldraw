import { BaseBoxShapeTool } from '@tldraw/tldraw'

// Extending the base box shape tool gives us a lot of functionality for free.
export class CardShapeTool extends BaseBoxShapeTool {
	static override id = 'card'
	static override initial = 'idle'

	override shapeType = 'card'
}
