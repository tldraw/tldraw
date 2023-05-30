import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	onPointerEnter: TLEventHandlers['onPointerEnter'] = (info) => {
		switch (info.target) {
			case 'canvas': {
				// noop
				break
			}
			case 'shape': {
				const { selectedIds, focusLayerId } = this.app
				const hoveringShape = this.app.getOutermostSelectableShape(
					info.shape,
					(parent) => !selectedIds.includes(parent.id)
				)
				if (hoveringShape.id !== focusLayerId) {
					if (hoveringShape.type === 'text') {
						this.app.setHoveredId(hoveringShape.id)
					}
				}
				break
			}
		}
	}

	onPointerLeave: TLEventHandlers['onPointerLeave'] = (info) => {
		switch (info.target) {
			case 'shape': {
				this.app.setHoveredId(null)
				break
			}
		}
	}

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const { hoveredId } = this.app
		if (hoveredId) {
			const shape = this.app.getShapeById(hoveredId)!
			if (shape.type === 'text') {
				requestAnimationFrame(() => {
					this.app.setSelectedIds([shape.id])
					this.app.setEditingId(shape.id)
					this.app.setSelectedTool('select.editing_shape', {
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

	onEnter = () => {
		this.app.setCursor({ type: 'cross' })
	}

	onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		if (info.key === 'Enter') {
			const shape = this.app.selectedShapes[0]
			if (shape && shape.type === 'geo') {
				this.app.setSelectedTool('select')
				this.app.setEditingId(shape.id)
				this.app.root.current.value!.transition('editing_shape', {
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
