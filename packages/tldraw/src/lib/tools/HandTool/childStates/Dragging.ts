import { CAMERA_SLIDE_FRICTION, StateNode, TLEventHandlers, Vec } from '@tldraw/editor'

export class Dragging extends StateNode {
	static override id = 'dragging'

	camera = new Vec()

	override onEnter = () => {
		const { editor } = this
		this.camera = Vec.From(editor.getCamera())

		editor.stopCameraAnimation()
		if (editor.getInstanceState().followingUserId) {
			editor.stopFollowingUser()
		}
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

	override onTick = () => {
		this.update()
	}

	private update() {
		const { editor } = this
		const { currentScreenPoint, originScreenPoint } = editor.inputs
		this.editor.setCamera(Vec.Sub(currentScreenPoint, originScreenPoint).add(this.camera))
	}

	private complete() {
		this.editor.setCamera(this.editor.getCamera())
		this.editor.slideCamera({
			speed: Math.min(2, this.editor.inputs.pointerVelocity.len()),
			direction: this.editor.inputs.pointerVelocity,
			friction: CAMERA_SLIDE_FRICTION,
		})

		this.parent.transition('idle')
	}
}
