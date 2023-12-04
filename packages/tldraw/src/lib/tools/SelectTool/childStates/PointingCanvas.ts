import { StateNode, TLEventHandlers } from '@tldraw/editor'
import { selectOnCanvasPointerUp } from '../../selection-logic/selectOnCanvasPointerUp'

export class PointingCanvas extends StateNode {
	static override id = 'pointing_canvas'

	override onEnter = () => {
		const { inputs } = this.editor

		if (!inputs.shiftKey) {
			if (this.editor.getSelectedShapeIds().length > 0) {
				this.editor.mark('selecting none')
				this.editor.selectNone()
			}
		}
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('brushing', info)
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		// todo: also make this deselect
		selectOnCanvasPointerUp(this.editor)
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt = () => {
		this.parent.transition('idle')
	}

	private complete() {
		this.parent.transition('idle')
	}
}
