import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { hasRichText, startEditingShapeWithRichText } from '../../../tools/SelectTool/selectHelpers'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		const { editor } = this
		if (info.key === 'Enter') {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (editor.canEditShape(onlySelectedShape)) {
				if (hasRichText(onlySelectedShape)) {
					startEditingShapeWithRichText(editor, onlySelectedShape, true)
				} else {
					editor.setEditingShape(onlySelectedShape)
				}
			}
		}
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
