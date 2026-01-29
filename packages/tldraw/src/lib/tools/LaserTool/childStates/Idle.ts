import { StateNode } from '@tldraw/editor'
import { LaserTool } from '../LaserTool'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown() {
		// Get or create the shared laser session from the parent tool
		const sessionId = (this.parent as LaserTool).getSessionId()
		const scribble = this.editor.scribbles.addScribbleToSession(sessionId, {
			color: 'laser',
			opacity: 0.7,
			size: 4,
			taper: false,
		})
		this.parent.transition('lasering', { sessionId, scribbleId: scribble.id })
	}
}
