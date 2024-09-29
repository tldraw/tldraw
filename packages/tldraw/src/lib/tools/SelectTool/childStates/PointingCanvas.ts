import { StateNode, TLPointerEventInfo } from '@tldraw/editor'
import { selectOnCanvasPointerUp } from '../../selection-logic/selectOnCanvasPointerUp'

export class PointingCanvas extends StateNode {
	static override id = 'pointing_canvas'

	didCtrlOnEnter = false

	override onEnter(info: TLPointerEventInfo & { target: 'canvas' }) {
		const { inputs } = this.editor

		this.didCtrlOnEnter = inputs.ctrlKey

		const additiveSelectionKey = info.ctrlKey || info.shiftKey

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

	override onPointerUp() {
		// todo: also make this deselect
		selectOnCanvasPointerUp(this.editor)
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
