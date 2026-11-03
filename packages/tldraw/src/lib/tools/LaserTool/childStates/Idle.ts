import { StateNode } from '@tldraw/editor'
import { LaserTool } from '../LaserTool'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown() {
		// Get or create the shared laser session from the parent tool
		const { sessionId, scribbleId } = (this.parent as LaserTool).startScribble()
		this.parent.transition('lasering', { sessionId, scribbleId })
	}
}
