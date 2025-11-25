import { StateNode, TLPointerEventInfo } from '@tldraw/editor'

export class PointingCrop extends StateNode {
	static override id = 'pointing_crop'

	override onCancel() {
		this.editor.setCurrentTool('select.crop.idle', {})
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.isDragging) {
			this.startDragging(info)
		}
	}
	override onLongPress(info: TLPointerEventInfo) {
		this.startDragging(info)
	}

	override onPointerUp(info: TLPointerEventInfo) {
		this.editor.setCurrentTool('select.crop.idle', info)
	}

	startDragging(info: TLPointerEventInfo) {
		this.editor.setCurrentTool('select.crop.translating_crop', info)
	}
}
