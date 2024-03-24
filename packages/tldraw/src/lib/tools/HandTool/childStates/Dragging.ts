import { Box, CAMERA_SLIDE_FRICTION, StateNode, TLEventHandlers, Vec, clamp } from '@tldraw/editor'

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
		const { editor } = this
		const { currentScreenPoint, originScreenPoint } = editor.inputs

		const delta = Vec.Sub(currentScreenPoint, originScreenPoint)

		const cameraOptions = editor.getCameraOptions()
		if (cameraOptions?.bounds) {
			const { x: cx, y: cy, z: cz } = this.camera
			const point = { x: cx + delta.x / cz, y: cy + delta.y / cz, z: cz }

			const vsb = editor.getViewportScreenBounds()

			const { padding, elastic } = cameraOptions
			let [py, px] = Array.isArray(padding) ? padding : [padding, padding]
			py = Math.min(py, vsb.w / 2)
			px = Math.min(px, vsb.h / 2)

			const bounds = Box.From(cameraOptions.bounds)

			const zx = (vsb.w - px * 2) / bounds.width
			const zy = (vsb.h - py * 2) / bounds.height

			if (point.z > zx) {
				const minX = -bounds.maxX + (vsb.w - px) / point.z
				const maxX = bounds.x + px / point.z
				point.x = clamp(
					point.x,
					elastic ? minX - (minX - point.x) / 10 : minX,
					elastic ? maxX + (point.x - maxX) / 10 : maxX
				)
			} else {
				const cx = vsb.midX / point.z - bounds.midX
				point.x = elastic ? cx - (cx - point.x) / 10 : cx
			}

			if (point.z > zy) {
				const minY = -bounds.maxY + (vsb.h - py) / point.z
				const maxY = bounds.y + py / point.z
				point.y = clamp(
					point.y,
					elastic ? minY - (minY - point.y) / 10 : minY,
					elastic ? maxY + (point.y - maxY) / 10 : maxY
				)
			} else {
				const cy = vsb.midY / point.z - bounds.midY
				point.y = elastic ? cy - (cy - point.y) / 10 : cy
			}

			this.editor.setCamera(point, { force: true })
		} else {
			this.editor.pan(delta)
		}
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
