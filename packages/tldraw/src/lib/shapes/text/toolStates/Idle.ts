import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { updateHoveredShapeId } from '../../../tools/selection-logic/updateHoveredShapeId'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerMove(info: TLPointerEventInfo) {
		switch (info.target) {
			case 'shape':
			case 'canvas': {
				updateHoveredShapeId(this.editor)
			}
		}
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		updateHoveredShapeId.cancel()
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
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
