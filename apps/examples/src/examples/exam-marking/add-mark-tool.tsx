import { StateNode } from 'tldraw'
import { examMarkShapeDefaultProps, IExamMarkShape } from './add-mark-util'

// Check out the custom tool example for a more detailed explanation of the StateNode class.

export class MarkingTool extends StateNode {
	static override id = 'mark'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const { w, h } = examMarkShapeDefaultProps

		this.editor.createShape<IExamMarkShape>({
			type: 'exam-mark',
			x: this.editor.inputs.currentPagePoint.x - w / 2,
			y: this.editor.inputs.currentPagePoint.y - h / 2,
		})
		if (!this.editor.getInstanceState().isToolLocked) {
			this.editor.setCurrentTool('select')
		}
	}
}
