import { StateNode, Vec } from '@tldraw/editor'

export class Dragging extends StateNode {
	static override id = 'dragging'
	static override trackPerformance = true

	initialCamera = new Vec()

	override onEnter() {
		this.initialCamera = Vec.From(this.editor.getCamera())
		this.update()
	}

	override onPointerMove() {
		this.update()
	}

	override onPointerDown() {
		// A second touch resets the input origin to the new pointer, so continuing
		// the pan would snap the camera. Yield before the pinch begins; the pan
		// does not resume when the pinch ends.
		this.parent.transition('idle')
	}

	override onPointerUp() {
		this.complete()
	}

	override onInterrupt() {
		// A pinch interrupts when it starts (without a preceding pointer_down on
		// some inputs, like Safari trackpads), so end the pan here too.
		this.parent.transition('idle')
	}

	override onCancel() {
		this.parent.transition('idle')
	}

	override onComplete() {
		this.complete()
	}

	private update() {
		const { initialCamera, editor } = this
		const currentScreenPoint = editor.inputs.getCurrentScreenPoint()
		const originScreenPoint = editor.inputs.getOriginScreenPoint()

		const delta = Vec.Sub(currentScreenPoint, originScreenPoint).div(editor.getZoomLevel())
		if (delta.len2() === 0) return
		editor.setCamera(initialCamera.clone().add(delta))
	}

	private complete() {
		const { editor } = this
		const pointerVelocity = editor.inputs.getPointerVelocity()

		const velocityAtPointerUp = Math.min(pointerVelocity.len(), 2)

		if (velocityAtPointerUp > 0.1) {
			this.editor.slideCamera({
				speed: velocityAtPointerUp,
				direction: { x: pointerVelocity.x, y: pointerVelocity.y, z: 0 },
			})
		}

		this.parent.transition('idle')
	}
}
