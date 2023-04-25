import { TLEventHandlers, TLPointerEvent } from '../../../../../types/event-types'
import { StateNode } from '../../../../StateNode'

export class PointingCrop extends StateNode {
	static override id = 'pointing_crop'

	onCancel: TLEventHandlers['onCancel'] = () => {
		this.app.setSelectedTool('select.crop.idle', {})
	}

	onPointerMove: TLPointerEvent = (info) => {
		if (this.app.inputs.isDragging) {
			this.app.setSelectedTool('select.crop.translating_crop', info)
		}
	}

	onPointerUp: TLPointerEvent = (info) => {
		this.app.setSelectedTool('select.crop.idle', info)
	}
}
