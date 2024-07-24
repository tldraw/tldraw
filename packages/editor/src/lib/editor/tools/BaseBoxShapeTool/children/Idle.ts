import { TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	onCancel() {
		this.editor.setCurrentTool('select')
	}
}
