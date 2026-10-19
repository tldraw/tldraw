import { StateNode, createShapeId } from 'tldraw'
import { IMathShape } from './MathShapeUtil'

// Click anywhere on the canvas to drop a math shape and start typing straight
// away: the tool creates the shape, then hands off to the select tool with the
// shape in the editing state so the math field focuses immediately.
export class MathTool extends StateNode {
	static override id = 'math'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		const id = createShapeId()
		this.editor.createShape<IMathShape>({
			id,
			type: 'math',
			x: currentPagePoint.x,
			y: currentPagePoint.y - 18,
			props: { text: '' },
		})
		this.editor.setCurrentTool('select')
		this.editor.select(id)
		this.editor.setEditingShape(id)
	}
}
