import { BaseBoxShapeTool, TLClickEvent } from '@tldraw/tldraw'
import { CardShapeUtil } from './CardShapeUtil'

// A tool used to create our custom card shapes. Extending the base
// box shape tool gives us a lot of functionality for free.
export class CardShapeTool extends BaseBoxShapeTool {
	static override id = 'card'
	static override initial = 'idle'

	override shapeType = CardShapeUtil

	override onDoubleClick: TLClickEvent = (_info) => {
		// you can handle events in handlers like this one;
		// check the BaseBoxShapeTool source as an example
	}
}
