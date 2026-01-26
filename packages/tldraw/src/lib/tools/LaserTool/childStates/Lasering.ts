import { StateNode } from '@tldraw/editor'
import { LaserTool } from '../LaserTool'

export class Lasering extends StateNode {
	static override id = 'lasering'

	private scribbleId = ''

	override onEnter() {
		// Get or create the shared laser session from the parent tool
		const session = (this.parent as LaserTool).getSession()

		const scribble = session.addScribble({
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
		const session = (this.parent as LaserTool).getSession()
		session.extend()
	}

	override onPointerMove() {
		this.pushPointToScribble()
	}

	override onPointerUp() {
		this.complete()
	}

	private pushPointToScribble() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		const session = (this.parent as LaserTool).getSession()
		session.addPoint(this.scribbleId, x, y)
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
