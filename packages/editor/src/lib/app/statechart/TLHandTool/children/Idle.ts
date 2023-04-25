import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	onEnter = () => {
		this.app.setCursor({ type: 'grab' })
	}

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	onCancel = () => {
		this.app.setSelectedTool('select')
	}
}
