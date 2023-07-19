import { StateNode, TLEventHandlers } from '@tldraw/editor'
import { GeoShapeUtil } from '../GeoShapeUtil'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	override onEnter = () => {
		this.editor.updateInstanceState({ cursor: { type: 'cross', rotation: 0 } }, true)
	}

	override onKeyUp: TLEventHandlers['onKeyUp'] = (info) => {
		if (info.key === 'Enter') {
			const shape = this.editor.onlySelectedShape
			if (shape && this.editor.isShapeOfType(shape, GeoShapeUtil)) {
				// todo: ensure that this only works with the most recently created shape, not just any geo shape that happens to be selected at the time
				this.editor.mark('editing shape')
				this.editor.setEditingId(shape.id)
				this.editor.setCurrentTool('select.editing_shape', {
					...info,
					target: 'shape',
					shape,
				})
			}
		}
	}

	override onCancel = () => {
		this.editor.setCurrentTool('select')
	}
}
