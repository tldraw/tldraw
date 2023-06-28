import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class PointingArrowLabel extends StateNode {
	static override id = 'pointing_arrow_label'

	info = {} as TLPointerEventInfo & { target: 'label' }

	onEnter = (info: TLPointerEventInfo & { target: 'label' }) => {
		this.info = info

		this.editor.setCursor({ type: 'grabbing' })
	}

	onExit = () => {
		this.editor.setHintingIds([])
		this.editor.setCursor({ type: 'default' })
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.parent.transition('idle', this.info)
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging_arrow_label', this.info)
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
