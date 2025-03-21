import { StateNode, Vec } from '@tldraw/editor'

export class Dragging extends StateNode {
	static override id = 'dragging'

	initialCamera = new Vec()

	override onEnter() {
		this.initialCamera = Vec.From(this.editor.getCamera())
		this.update()
	}

	override onPointerMove() {
		this.update()
	}

	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.parent.transition('idle')
	}

	override onComplete() {
		this.complete()
	}

	private update() {
		const { initialCamera, editor } = this

		const delta = Vec.Sub(
			editor.inputs.getCurrentScreenPoint(),
			editor.inputs.getOriginScreenPoint()
		).div(editor.getZoomLevel())
		if (delta.len2() === 0) return
		editor.setCamera(initialCamera.clone().add(delta))
	}

	private complete() {
		const { editor } = this
		const pointerVelocity = editor.inputs.getPointerVelocity()

		const velocityAtPointerUp = Math.min(Vec.Len(pointerVelocity), 2)

		if (velocityAtPointerUp > 0.1) {
			this.editor.slideCamera({ speed: velocityAtPointerUp, direction: pointerVelocity })
		}

		this.parent.transition('idle')
	}
}
