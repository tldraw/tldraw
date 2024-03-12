import { Session } from '@tldraw/editor'

export class LaseringSession extends Session {
	id = 'lasering'
	scribbleId = 'laser'

	override onStart() {
		this.editor.scribbles.addScribble(
			{
				color: 'laser',
				opacity: 0.7,
				size: 4,
				delay: 1200,
				shrink: 0.05,
				taper: true,
			},
			this.scribbleId
		)
	}

	override onUpdate() {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor.scribbles.addPoint(this.scribbleId, x, y)
	}

	override onEnd() {
		this.editor.scribbles.stop(this.scribbleId)
	}
}
