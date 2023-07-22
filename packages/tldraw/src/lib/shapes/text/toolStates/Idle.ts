import {
	StateNode,
	TLEventHandlers,
	TLGeoShape,
	TLTextShape,
	getSmallestShapeContainingCurrentPagePoint,
	updateHoveredId,
} from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		switch (info.target) {
			case 'shape':
			case 'canvas': {
				updateHoveredId(this.editor)
			}
		}
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const hitShape =
			this.editor.hoveredShape ?? getSmallestShapeContainingCurrentPagePoint(this.editor)
		if (hitShape) {
			if (this.editor.isShapeOfType<TLTextShape>(hitShape, 'text')) {
				requestAnimationFrame(() => {
					this.editor.setSelectedIds([hitShape.id])
					this.editor.setEditingId(hitShape.id)
					this.editor.setCurrentTool('select.editing_shape', {
						...info,
						target: 'shape',
						shape: hitShape,
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
