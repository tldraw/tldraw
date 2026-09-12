import { StateNode, TLPointerEventInfo } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		if (this.editor.getIsReadonly()) return
		this.editor.selectNone()
		this.parent.transition('cutting', info)
	}
}
