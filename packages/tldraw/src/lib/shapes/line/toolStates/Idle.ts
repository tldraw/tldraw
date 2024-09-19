import { StateNode, TLShapeId } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	private shapeId = '' as TLShapeId

	override onEnter(info: { shapeId: TLShapeId }) {
		this.shapeId = info.shapeId
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		this.parent.transition('pointing', { shapeId: this.shapeId })
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
