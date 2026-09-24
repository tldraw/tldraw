import { StateNode, TLClickEventInfo, TLPointerEventInfo } from '@tldraw/editor'

export class PointingCrop extends StateNode {
	static override id = 'pointing_crop'

	private pendingDoubleClick: TLClickEventInfo | null = null

	override onEnter() {
		this.pendingDoubleClick = null
	}

	override onCancel() {
		this.editor.setCurrentTool('select.crop.idle', {})
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.startDragging(info)
		}
	}
	override onLongPress(info: TLPointerEventInfo) {
		this.startDragging(info)
	}

	override onPointerUp(info: TLPointerEventInfo) {
		if (this.pendingDoubleClick) {
			this.parent.transition('idle')
			this.parent.getCurrent()?.handleEvent(this.pendingDoubleClick)
			return
		}
		this.editor.setCurrentTool('select.crop.idle', info)
	}

	// See PointingResizeHandle.onDoubleClick
	override onDoubleClick(info: TLClickEventInfo) {
		if (
			this.editor.inputs.getShiftKey() ||
			info.phase !== 'down' ||
			info.ctrlKey ||
			info.shiftKey
		) {
			return
		}

		this.pendingDoubleClick = info
	}

	startDragging(info: TLPointerEventInfo) {
		this.editor.setCurrentTool('select.crop.translating_crop', info)
	}
}
