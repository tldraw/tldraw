import { StateNode } from '@tldraw/editor'

export class Lasering extends StateNode {
	static override id = 'lasering'

	private scribbleId = ''
	private sessionId = ''

	override onEnter(info: { sessionId: string; scribbleId: string }) {
		this.sessionId = info.sessionId
		this.scribbleId = info.scribbleId
		this.pushPointToScribble()
	}

	override onPointerMove() {
		this.pushPointToScribble()
	}

	private pushPointToScribble() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		this.editor.scribbles.addPointToSession(this.sessionId, this.scribbleId, x, y)
	}

	override onTick() {
		this.editor.scribbles.extendSession(this.sessionId)
	}

	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.onComplete()
	}

	override onComplete() {
		this.complete()
	}

	private complete() {
		this.editor.scribbles.complete(this.scribbleId)
		this.parent.transition('idle')
	}
}
