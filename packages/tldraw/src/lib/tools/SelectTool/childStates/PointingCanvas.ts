import { StateNode, TLEventHandlers } from '@tldraw/editor'
import { BrushingSession } from '../../../sessions/BrushingSession'
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
			const session = new BrushingSession(this.editor, { pointerId: info.pointerId })
			session.start()
			session.update()
			this.parent.transition('idle', info)
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
