import { StateNode } from '@tldraw/editor'
import { LaserTool } from '../LaserTool'

export class Lasering extends StateNode {
	static override id = 'lasering'
	static override trackPerformance = true

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
		// The session's idle timeout fires when ticks stall (a backgrounded tab, a throttled mobile
		// browser), so it can fade out and be removed while a stroke is still in progress. Adding a
		// point to it would throw (#10125), so continue the stroke in a fresh session instead.
		if (!this.editor.scribbles.isSessionActive(this.sessionId)) {
			const { sessionId, scribbleId } = (this.parent as LaserTool).startScribble()
			this.sessionId = sessionId
			this.scribbleId = scribbleId
		}
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
		if (this.editor.scribbles.isSessionActive(this.sessionId)) {
			this.editor.scribbles.complete(this.scribbleId)
		}
		this.parent.transition('idle')
	}
}
