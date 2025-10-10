import { StateNode, TLPointerEventInfo, TLShapeId } from 'tldraw'

export class Pen extends StateNode {
	static override id = 'pen'

	override onEnter(info: TLPointerEventInfo & { shapeId: TLShapeId }) {
		this.editor.updateInstanceState({ isToolLocked: false })
		this.editor.setEditingShape(info.shapeId)
	}
}
