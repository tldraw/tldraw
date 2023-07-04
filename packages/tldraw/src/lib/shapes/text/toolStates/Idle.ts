import { StateNode, TLEventHandlers, TLGeoShape, TLTextShape } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerEnter: TLEventHandlers['onPointerEnter'] = (info) => {
		switch (info.target) {
			case 'canvas': {
				// noop
				break
			}
			case 'shape': {
				const { selectedIds, focusLayerId } = this.editor
				const hoveringShape = this.editor.getOutermostSelectableShape(
					info.shape,
					(parent) => !selectedIds.includes(parent.id)
				)
				if (hoveringShape.id !== focusLayerId) {
					if (this.editor.isShapeOfType<TLTextShape>(hoveringShape, 'text')) {
						this.editor.setHoveredId(hoveringShape.id)
					}
				}
				break
			}
		}
	}

	override onPointerLeave: TLEventHandlers['onPointerLeave'] = (info) => {
		switch (info.target) {
			case 'shape': {
				this.editor.setHoveredId(null)
				break
			}
		}
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const { hoveredId } = this.editor
		if (hoveredId) {
			const shape = this.editor.getShapeById(hoveredId)!
			if (this.editor.isShapeOfType<TLTextShape>(shape, 'text')) {
				requestAnimationFrame(() => {
					this.editor.setSelectedIds([shape.id])
					this.editor.setEditingId(shape.id)
					this.editor.setSelectedTool('select.editing_shape', {
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
		this.editor.setCursor({ type: 'cross' })
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		if (info.key === 'Enter') {
			const shape = this.editor.selectedShapes[0]
			if (shape && this.editor.isShapeOfType<TLGeoShape>(shape, 'geo')) {
				this.editor.setSelectedTool('select')
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
		this.editor.setSelectedTool('select')
	}
}
