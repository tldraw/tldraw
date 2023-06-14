import { StateNode } from '../../../tools/StateNode'
import { TLEventHandlers } from '../../../types/event-types'

export class Idle extends StateNode {
	static override id = 'idle'

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	onEnter = () => {
		this.editor.setCursor({ type: 'cross' })
	}

	onCancel = () => {
		this.editor.setSelectedTool('select')
	}
}
