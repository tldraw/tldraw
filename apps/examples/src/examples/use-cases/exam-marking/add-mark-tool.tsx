import { StateNode } from 'tldraw'
import { EXAM_MARK_HEIGHT, EXAM_MARK_WIDTH } from './add-mark-util'

// See the custom-tool example for a fuller explanation of `StateNode`.
export class MarkingTool extends StateNode {
	static override id = 'mark'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerUp() {
		const pagePoint = this.editor.inputs.getCurrentPagePoint()
		this.editor.createShape({
			type: 'exam-mark',
			x: pagePoint.x - EXAM_MARK_WIDTH / 2,
			y: pagePoint.y - EXAM_MARK_HEIGHT / 2,
		})

		if (!this.editor.getInstanceState().isToolLocked) {
			this.editor.setCurrentTool('select')
		}
	}
}
