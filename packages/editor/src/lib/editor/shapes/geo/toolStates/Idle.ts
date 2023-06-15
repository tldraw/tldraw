import { StateNode } from '../../../tools/StateNode'
import { TLEventHandlers } from '../../../types/event-types'
import { GeoShapeUtil } from '../GeoShapeUtil'

export class Idle extends StateNode {
	static override id = 'idle'

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	onEnter = () => {
		this.editor.setCursor({ type: 'cross' })
	}

	onKeyUp: TLEventHandlers['onKeyUp'] = (info) => {
		if (info.key === 'Enter') {
			const shape = this.editor.onlySelectedShape
			if (shape && this.editor.isShapeOfType(shape, GeoShapeUtil)) {
				// todo: ensure that this only works with the most recently created shape, not just any geo shape that happens to be selected at the time
				this.editor.mark('editing shape')
				this.editor.setEditingId(shape.id)
				this.editor.setSelectedTool('select.editing_shape', {
					...info,
					target: 'shape',
					shape,
				})
			}
		}
	}

	onCancel = () => {
		this.editor.setSelectedTool('select')
	}
}
