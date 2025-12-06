import { StateNode, TLPointerEventInfo } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onCancel() {
		this.editor.setCurrentTool('select')
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('lasering', info)
	}
}
