import { StateNode } from 'tldraw'
import { IExamMarkShape } from './add-mark-util'

export class MarkingTool extends StateNode {
	static override id = 'mark'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 15 })
	}

	override onPointerDown() {
		this.editor.createShape<IExamMarkShape>({
			type: 'exam-mark',
			x: this.editor.inputs.currentPagePoint.x,
			y: this.editor.inputs.currentPagePoint.y,
		})
		this.editor.setCurrentTool('select')
	}
}
