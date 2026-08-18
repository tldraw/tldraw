import { StateNode, Vec, clamp, last } from '@tldraw/editor'

export class OneFingerZooming extends StateNode {
	static override id = 'one_finger_zooming'

	private anchorScreenPoint = new Vec()
	private initialCamera = new Vec()
	private initialZoom = 1
	private originScreenY = 0

	override onEnter() {
		const camera = this.editor.getCamera()
		this.initialCamera = Vec.From(camera)
		this.initialZoom = camera.z
		this.anchorScreenPoint = this.editor.inputs.getOriginScreenPoint().clone()
		this.originScreenY = this.editor.inputs.getCurrentScreenPoint().y
		this.editor.setCursor({ type: 'grab', rotation: 0 })
	}

	override onPointerMove() {
		this.editor.menus.clearOpenMenus()

		const currentScreenY = this.editor.inputs.getCurrentScreenPoint().y

		// Dragging down zooms in, up zooms out (google maps default). The user's zoom
		// direction preference is ignored because it only applies to mouse input.
		const dy = currentScreenY - this.originScreenY

		// ~200px of drag ≈ 2x zoom change.
		const zoomFactor = Math.pow(2, dy / 200)
		const newZoom = this.clampZoom(this.initialZoom * zoomFactor)

		const { x: cx, y: cy } = this.initialCamera
		const { x: sx, y: sy } = this.anchorScreenPoint
		this.editor.setCamera(
			new Vec(
				cx + sx / newZoom - sx / this.initialZoom,
				cy + sy / newZoom - sy / this.initialZoom,
				newZoom
			),
			{ immediate: true }
		)
	}

	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.parent.transition('idle')
	}

	override onInterrupt() {
		this.parent.transition('idle')
	}

	private complete() {
		const pointerVelocity = this.editor.inputs.getPointerVelocity()
		const velocityAtPointerUp = Math.min(pointerVelocity.len(), 2)

		if (velocityAtPointerUp > 0.1) {
			// Use velocity y-sign for momentum direction (positive y = moving down = zoom in)
			this.editor.slideCamera({
				speed: velocityAtPointerUp,
				direction: { x: 0, y: 0, z: Math.sign(pointerVelocity.y) * 0.01 },
			})
		}
		this.parent.transition('idle')
	}

	private clampZoom(zoom: number): number {
		const { zoomSteps } = this.editor.getCameraOptions()
		const baseZoom = this.editor.getBaseZoom()
		const zoomMin = zoomSteps[0] * baseZoom
		const zoomMax = last(zoomSteps)! * baseZoom
		return clamp(zoom, zoomMin, zoomMax)
	}
}
