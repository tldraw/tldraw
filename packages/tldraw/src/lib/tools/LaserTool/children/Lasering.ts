import { StateNode, TLEventHandlers } from '@tldraw/editor'

export class Lasering extends StateNode {
	static override id = 'lasering'

	scribbleId = 'id'

	override onEnter = () => {
		const scribble = this.editor.scribbles.addScribble({
			color: 'laser',
			opacity: 0.7,
			size: 4,
			delay: 1200,
			shrink: 0.05,
			taper: true,
		})
		this.scribbleId = scribble.id
		this.pushPointToScribble()
	}

	override onExit = () => {
		this.editor.scribbles.stop(this.scribbleId)
	}

	override onPointerMove = () => {
		this.pushPointToScribble()
	}

	override onPointerUp = () => {
		this.complete()
	}

	private pushPointToScribble = () => {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor.scribbles.addPoint(this.scribbleId, x, y)
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle')
	}

	private cancel() {
		this.parent.transition('idle')
	}
}
