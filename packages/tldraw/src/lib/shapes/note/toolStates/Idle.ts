import { StateNode, TLPointerEventInfo } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		if (this.editor.checkCapability('create-shape') || this.editor.checkCapability('edit-shape')) {
			return
		}
		this.parent.transition('pointing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
