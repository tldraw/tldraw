import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class EditingShape extends StateNode {
	static override id = 'editing_shape'

	onPointerEnter: TLEventHandlers['onPointerEnter'] = (info) => {
		switch (info.target) {
			case 'shape': {
				const { selectedIds, focusLayerId } = this.app
				const hoveringShape = this.app.getOutermostSelectableShape(
					info.shape,
					(parent) => !selectedIds.includes(parent.id)
				)
				if (hoveringShape.id !== focusLayerId) {
					this.app.setHoveredId(hoveringShape.id)
				}
				break
			}
		}
	}

	onPointerLeave: TLEventHandlers['onPointerEnter'] = (info) => {
		switch (info.target) {
			case 'shape': {
				this.app.setHoveredId(null)
				break
			}
		}
	}

	onExit = () => {
		if (!this.app.pageState.editingId) return
		const { editingId } = this.app.pageState
		if (!editingId) return

		// Clear the editing shape
		this.app.setEditingId(null)

		const shape = this.app.getShapeById(editingId)!
		const util = this.app.getShapeUtil(shape)

		// Check for changes on editing end
		util.onEditEnd?.(shape)
	}

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		switch (info.target) {
			case 'shape': {
				const { shape } = info

				const { editingId } = this.app.pageState

				if (editingId) {
					if (shape.id === editingId) {
						return
					}

					const editingShape = this.app.getShapeById(editingId)

					if (editingShape) {
						const editingShapeUtil = this.app.getShapeUtil(editingShape)
						editingShapeUtil.onEditEnd?.(editingShape)

						const util = this.app.getShapeUtil(shape)

						// If the user has clicked onto a different shape of the same type
						// which is available to edit, select it and begin editing it.
						if (
							shape.type === editingShape.type &&
							util.canEdit?.(shape) &&
							!this.app.isShapeOrAncestorLocked(shape)
						) {
							this.app.setEditingId(shape.id)
							this.app.setHoveredId(shape.id)
							this.app.setSelectedIds([shape.id])
							return
						}
					}
				}
			}
		}

		this.parent.transition('idle', info)
		this.parent.current.value?.onPointerDown?.(info)
	}

	onComplete: TLEventHandlers['onComplete'] = (info) => {
		this.parent.transition('idle', info)
	}

	onCancel: TLEventHandlers['onCancel'] = (info) => {
		this.parent.transition('idle', info)
	}
}
