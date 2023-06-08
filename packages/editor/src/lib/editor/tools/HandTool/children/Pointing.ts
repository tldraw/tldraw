import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Pointing extends StateNode {
	static override id = 'pointing'

	onEnter = () => {
		this.editor.stopCameraAnimation()
		this.editor.setCursor({ type: 'grabbing' })
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging', info)
		}
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onCancel: TLEventHandlers['onCancel'] = () => {
		this.complete()
	}

	onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	onInterrupt: TLEventHandlers['onInterrupt'] = () => {
		this.complete()
	}

	complete() {
		this.parent.transition('idle', {})
	}
}
