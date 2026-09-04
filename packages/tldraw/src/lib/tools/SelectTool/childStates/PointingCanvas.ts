import { StateNode, TLClickEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { selectOnCanvasPointerUp } from '../../selection-logic/selectOnCanvasPointerUp'

export class PointingCanvas extends StateNode {
	static override id = 'pointing_canvas'

	private didMark = false

	override onEnter(info: TLPointerEventInfo & { target: 'canvas' }) {
		const additiveSelectionKey = info.shiftKey || info.accelKey

		this.didMark = false

		if (!additiveSelectionKey) {
			if (this.editor.getSelectedShapeIds().length > 0) {
				this.editor.markHistoryStoppingPoint('selecting none')
				this.didMark = true
				this.editor.selectNone()
			}
		}
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			// Brushing marks its own stopping point before its first selection change, unless the
			// deselect above already placed one; a second mark would split a click-drag that
			// starts from an existing selection into two undo steps
			this.parent.transition('brushing', { ...info, didMarkHistory: this.didMark })
		}
	}

	override onPointerUp(info: TLPointerEventInfo) {
		// todo: also make this deselect
		selectOnCanvasPointerUp(this.editor, info)
		this.complete()
	}

	override onDoubleClick(info: TLClickEventInfo) {
		if (
			this.editor.inputs.getShiftKey() ||
			info.phase !== 'down' ||
			info.ctrlKey ||
			info.shiftKey
		) {
			return
		}

		this.parent.transition('idle')
		this.parent.getCurrent()?.handleEvent(info)
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
