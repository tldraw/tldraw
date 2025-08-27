import { StateNode } from 'tldraw'
import { EXAM_MARK_HEIGHT, EXAM_MARK_WIDTH, IExamMarkShape } from './add-mark-util'

// Check out the custom tool example for a more detailed explanation of the StateNode class.

export class MarkingTool extends StateNode {
	static override id = 'mark'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerUp() {
		this.editor.createShape<IExamMarkShape>({
			type: 'exam-mark',
			x: this.editor.inputs.currentPagePoint.x - EXAM_MARK_WIDTH / 2,
			y: this.editor.inputs.currentPagePoint.y - EXAM_MARK_HEIGHT / 2,
		})

		if (!this.editor.getInstanceState().isToolLocked) {
			this.editor.setCurrentTool('select')
		}
	}
}
