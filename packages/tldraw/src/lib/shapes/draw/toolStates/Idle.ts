import { StateNode, TLPointerEventInfo } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		if (info.accelKey && !info.shiftKey) {
			this.editor.setCurrentTool('eraser.pointing', { ...info, onInteractionEnd: this.parent.id })
			return
		}

		this.parent.transition('drawing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
