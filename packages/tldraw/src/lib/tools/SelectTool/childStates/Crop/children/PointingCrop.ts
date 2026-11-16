import { StateNode, TLClickEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { DeferredDoubleClick } from '../../../selectHelpers'

export class PointingCrop extends StateNode {
	static override id = 'pointing_crop'

	private doubleClick = new DeferredDoubleClick(this)

	override onEnter(info: TLPointerEventInfo) {
		this.doubleClick.start(info)
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
		if (this.doubleClick.replay()) return
		this.editor.setCurrentTool('select.crop.idle', info)
	}

	override onDoubleClick(info: TLClickEventInfo) {
		this.doubleClick.defer(info)
	}

	startDragging(info: TLPointerEventInfo) {
		this.editor.setCurrentTool('select.crop.translating_crop', info)
	}
}
