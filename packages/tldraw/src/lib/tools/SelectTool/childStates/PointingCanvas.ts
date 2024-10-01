import { StateNode, TLPointerEventInfo } from '@tldraw/editor'
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

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.isDragging) {
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
