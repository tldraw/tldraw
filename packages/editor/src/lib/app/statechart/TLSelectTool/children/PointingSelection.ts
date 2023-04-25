import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class PointingSelection extends StateNode {
	static override id = 'pointing_selection'

	info = {} as TLPointerEventInfo & {
		target: 'selection'
	}

	onEnter = (info: TLPointerEventInfo & { target: 'selection' }) => {
		this.info = info
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		this.app.selectNone()
		this.parent.transition('idle', info)
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.app.inputs.isDragging) {
			if (this.app.isReadOnly) return
			this.parent.transition('translating', info)
		}
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt = () => {
		this.cancel()
	}

	private cancel() {
		this.parent.transition('idle', {})
	}
}
