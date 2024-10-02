import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		if (info.key === 'Enter') {
			if (this.editor.getInstanceState().isReadonly) return null

			const onlySelectedShape = this.editor.getOnlySelectedShape()
			// If the only selected shape is editable, start editing it
			if (
				onlySelectedShape &&
				this.editor.getShapeUtil(onlySelectedShape).canEdit(onlySelectedShape)
			) {
				this.editor.setEditingShape(onlySelectedShape.id) // will transition to 'select.editing_shape'
			}
		}
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
