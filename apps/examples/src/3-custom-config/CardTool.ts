// Tool
// ----
// Because the card tool can be just a rectangle, we can extend the

import { BaseBoxTool } from '@tldraw/tldraw'

// BoxTool class. This gives us a lot of functionality for free.
export class CardTool extends BaseBoxTool {
	static override id = 'card'
	static override initial = 'idle'

	override shapeType = 'card'
}
