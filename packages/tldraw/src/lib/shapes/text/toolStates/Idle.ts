import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { startEditingShape } from '../../../tools/SelectTool/selectHelpers'
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
			const onlySelectedShape = this.editor.getOnlySelectedShape()
			if (!onlySelectedShape) return
			this.editor.setCurrentTool('select')
			if (
				!startEditingShape(this.editor, onlySelectedShape, {
					info,
				})
			) {
				return
			}
		}
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
