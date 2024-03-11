import { StateNode, TLPointerEvent } from '@tldraw/editor'

export class PointingCrop extends StateNode {
	static override id = 'pointing_crop'

	override onPointerMove: TLPointerEvent = (info) => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('translating_crop', info)
		}
	}

	override onPointerUp = () => {
		this.complete()
	}

	override onCancel = () => {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle', {})
	}
}
