import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	onEnter = () => {
		this.app.setCursor({ type: 'cross' })
	}

	onKeyUp: TLEventHandlers['onKeyUp'] = (info) => {
		if (info.key === 'Enter') {
			const shape = this.app.onlySelectedShape
			if (shape && shape.type === 'geo') {
				// todo: ensure that this only works with the most recently created shape, not just any geo shape that happens to be selected at the time
				this.app.mark('editing shape')
				this.app.setEditingId(shape.id)
				this.app.setSelectedTool('select.editing_shape', {
					...info,
					target: 'shape',
					shape,
				})
			}
		}
	}

	onCancel = () => {
		this.app.setSelectedTool('select')
	}
}
