import { Vec2d } from '@tldraw/primitives'
import { HAND_TOOL_FRICTION } from '../../../../constants'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

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
			this.editor.pan(delta.x, delta.y)
		}
	}

	private complete() {
		this.editor.slideCamera({
			speed: Math.min(2, this.editor.inputs.pointerVelocity.len()),
			direction: this.editor.inputs.pointerVelocity,
			friction: HAND_TOOL_FRICTION,
		})

		this.parent.transition('idle', {})
	}
}
