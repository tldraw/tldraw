import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	onEnter = () => {
		this.editor.setCursor({ type: 'grab' })
	}

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	onCancel = () => {
		this.editor.setSelectedTool('select')
	}
}
