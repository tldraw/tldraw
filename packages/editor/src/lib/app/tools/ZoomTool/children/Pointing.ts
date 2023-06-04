import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Pointing extends StateNode {
	static override id = 'pointing'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onPointerMove: TLEventHandlers['onPointerUp'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('zoom_brushing', this.info)
		}
	}

	onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private complete() {
		const { currentScreenPoint } = this.editor.inputs
		if (this.editor.inputs.altKey) {
			this.editor.zoomOut(currentScreenPoint, { duration: 220 })
		} else {
			this.editor.zoomIn(currentScreenPoint, { duration: 220 })
		}
		this.parent.transition('idle', this.info)
	}

	private cancel() {
		this.parent.transition('idle', this.info)
	}
}
