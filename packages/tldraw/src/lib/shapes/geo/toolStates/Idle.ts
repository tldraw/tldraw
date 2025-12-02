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
			if (this.editor.getIsReadonly()) return null

			const onlySelectedShape = this.editor.getOnlySelectedShape()
			this.editor.startEditingShape(onlySelectedShape, { info })
		}
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
