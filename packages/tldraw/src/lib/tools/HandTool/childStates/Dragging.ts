import { CAMERA_SLIDE_FRICTION, StateNode, TLEventHandlers, Vec2d } from '@tldraw/editor'

export class Dragging extends StateNode {
	static override id = 'dragging'

	override onEnter = () => {
		this.update()
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		this.update()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.complete()
	}

	override onComplete = () => {
		this.complete()
	}

	private update() {
		const { currentScreenPoint, previousScreenPoint } = this.editor.inputs

		const delta = Vec2d.Sub(currentScreenPoint, previousScreenPoint)

		if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
			this.editor.pan(delta)
		}
	}

	private complete() {
		this.editor.slideCamera({
			speed: Math.min(2, this.editor.inputs.pointerVelocity.len()),
			direction: this.editor.inputs.pointerVelocity,
			friction: CAMERA_SLIDE_FRICTION,
		})

		this.parent.transition('idle', {})
	}
}
