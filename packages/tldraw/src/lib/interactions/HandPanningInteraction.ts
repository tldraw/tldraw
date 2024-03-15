import { CAMERA_SLIDE_FRICTION, Interaction, Vec } from '@tldraw/editor'

export class HandPanningInteraction extends Interaction {
	id = 'hand-panning'

	didPan = false

	override onStart() {
		this.editor.stopCameraAnimation()
		this.editor.updateInstanceState(
			{ cursor: { type: 'grabbing', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	override onUpdate() {
		const { editor } = this

		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		if (!editor.inputs.isDragging) {
			return
		}

		const { currentScreenPoint, previousScreenPoint } = this.editor.inputs

		const delta = Vec.Sub(currentScreenPoint, previousScreenPoint)

		if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
			this.editor.pan(delta)
		}
	}

	override onComplete() {
		this.editor.slideCamera({
			speed: Math.min(2, this.editor.inputs.pointerVelocity.len()),
			direction: this.editor.inputs.pointerVelocity,
			friction: CAMERA_SLIDE_FRICTION,
		})
	}
}
