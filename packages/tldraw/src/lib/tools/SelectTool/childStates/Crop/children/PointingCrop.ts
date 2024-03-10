import { StateNode, TLPointerEvent } from '@tldraw/editor'
import { info } from 'console'

export class PointingCrop extends StateNode {
	static override id = 'pointing_crop'

	override onCancel = () => {
		this.complete()
	}

	override onPointerMove: TLPointerEvent = (info) => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('translating_crop', info)
		}
	}

	override onPointerUp = () => {
		this.complete()
	}

	private complete() {
		this.editor.setCurrentTool('select.crop.idle', info)
	}
}
