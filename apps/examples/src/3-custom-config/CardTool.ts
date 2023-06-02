// Tool
// ----
// Because the card tool can be just a rectangle, we can extend the

import { TLBoxTool } from '@tldraw/tldraw'

// TLBoxTool class. This gives us a lot of functionality for free.
export class CardTool extends TLBoxTool {
	static override id = 'card'
	static override initial = 'idle'

	override shapeType = 'card'
}
