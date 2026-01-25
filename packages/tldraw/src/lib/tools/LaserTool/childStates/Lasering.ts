import { StateNode } from '@tldraw/editor'

export class Lasering extends StateNode {
	static override id = 'lasering'

	scribbleId = 'id'

	override onEnter() {
		const scribble = this.editor.telestration.addScribble({
			color: 'laser',
			opacity: 0.7,
			size: 4,
		})
		this.scribbleId = scribble.id
		this.pushPointToScribble()
	}

	override onTick() {
		// Keep the telestration session alive while pointer is down
		this.editor.telestration.extendSession()
	}

	override onPointerMove() {
		this.pushPointToScribble()
	}

	override onPointerUp() {
		this.complete()
	}

	private pushPointToScribble() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		this.editor.telestration.addPoint(this.scribbleId, x, y)
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle')
	}

	private cancel() {
		this.parent.transition('idle')
	}
}
