import { TLEventHandlers, TLPointerEvent } from '../../../../../types/event-types'
import { StateNode } from '../../../../StateNode'

export class PointingCrop extends StateNode {
	static override id = 'pointing_crop'

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.editor.setSelectedTool('select.crop.idle', {})
	}

	override onPointerMove: TLPointerEvent = (info) => {
		if (this.editor.inputs.isDragging) {
			this.editor.setSelectedTool('select.crop.translating_crop', info)
		}
	}

	override onPointerUp: TLPointerEvent = (info) => {
		this.editor.setSelectedTool('select.crop.idle', info)
	}
}
