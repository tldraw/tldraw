import { StateNode, TLClickEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { selectOnCanvasPointerUp } from '../../selection-logic/selectOnCanvasPointerUp'

export class PointingCanvas extends StateNode {
	static override id = 'pointing_canvas'

	override onEnter(info: TLPointerEventInfo & { target: 'canvas' }) {
		const additiveSelectionKey = info.shiftKey || info.accelKey

		if (!additiveSelectionKey) {
			if (this.editor.getSelectedShapeIds().length > 0) {
				this.editor.markHistoryStoppingPoint('selecting none')
				this.editor.selectNone()
			}
		}
	}

	override onDoubleClick(info: TLClickEventInfo) {
		if (info.phase === 'down' && this.editor.getInstanceState().isCoarsePointer) {
			this.parent.transition('one_finger_zooming', info)
		}
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('brushing', info)
		}
	}

	override onPointerUp(info: TLPointerEventInfo) {
		// todo: also make this deselect
		selectOnCanvasPointerUp(this.editor, info)
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onInterrupt() {
		this.parent.transition('idle')
	}

	private complete() {
		this.parent.transition('idle')
	}
}
