import { StateNode } from '@tldraw/editor'
import { LaserTool } from '../LaserTool'

export class Lasering extends StateNode {
	static override id = 'lasering'

	private scribbleId = ''

	override onEnter() {
		// Get or create the shared laser session from the parent tool
		const sessionId = (this.parent as LaserTool).getSessionId()

		const scribble = this.editor.scribbles.addScribbleToSession(sessionId, {
			color: 'laser',
			opacity: 0.7,
			size: 4,
			taper: false,
		})
		this.scribbleId = scribble.id
		this.pushPointToScribble()
	}

	override onTick() {
		// Keep the session alive while pointer is down
		const sessionId = (this.parent as LaserTool).getSessionId()
		this.editor.scribbles.extendSession(sessionId)
	}

	override onPointerMove() {
		this.pushPointToScribble()
	}

	override onPointerUp() {
		this.complete()
	}

	private pushPointToScribble() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		const sessionId = (this.parent as LaserTool).getSessionId()
		this.editor.scribbles.addPointToSession(sessionId, this.scribbleId, x, y)
	}

	override onCancel() {
		this.onComplete()
	}

	override onComplete() {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle')
	}
}
