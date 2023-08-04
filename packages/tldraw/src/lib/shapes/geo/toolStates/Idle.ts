import { StateNode, TLEventHandlers, TLGeoShape } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onKeyUp: TLEventHandlers['onKeyUp'] = (info) => {
		if (info.key === 'Enter') {
			const shape = this.editor.onlySelectedShape
			if (shape && this.editor.isShapeOfType<TLGeoShape>(shape, 'geo')) {
				// todo: ensure that this only works with the most recently created shape, not just any geo shape that happens to be selected at the time
				this.editor.mark('editing shape')
				this.editor.setEditingShapeId(shape.id)
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
