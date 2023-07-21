import { StateNode, TLEventHandlers, TLGeoShape, TLTextShape } from '@tldraw/editor'
import { getHoveredShapeId } from '../../../tools/SelectTool/shared'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		switch (info.target) {
			case 'shape':
			case 'canvas': {
				const nextHoveredId = getHoveredShapeId(this.editor)
				if (nextHoveredId !== this.editor.hoveredId) {
					this.editor.setHoveredId(nextHoveredId)
				}
			}
		}
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const { hoveredId } = this.editor
		if (hoveredId) {
			const shape = this.editor.getShape(hoveredId)!
			if (this.editor.isShapeOfType<TLTextShape>(shape, 'text')) {
				requestAnimationFrame(() => {
					this.editor.setSelectedIds([shape.id])
					this.editor.setEditingId(shape.id)
					this.editor.setCurrentTool('select.editing_shape', {
						...info,
						target: 'shape',
						shape,
					})
				})
				return
			}
		}

		this.parent.transition('pointing', info)
	}

	override onEnter = () => {
		this.editor.updateInstanceState({ cursor: { type: 'cross', rotation: 0 } }, true)
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		if (info.key === 'Enter') {
			const shape = this.editor.selectedShapes[0]
			if (shape && this.editor.isShapeOfType<TLGeoShape>(shape, 'geo')) {
				this.editor.setCurrentTool('select')
				this.editor.setEditingId(shape.id)
				this.editor.root.current.value!.transition('editing_shape', {
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
