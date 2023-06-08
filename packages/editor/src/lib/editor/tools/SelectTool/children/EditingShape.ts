import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class EditingShape extends StateNode {
	static override id = 'editing_shape'

	onPointerEnter: TLEventHandlers['onPointerEnter'] = (info) => {
		switch (info.target) {
			case 'shape': {
				const { selectedIds, focusLayerId } = this.editor
				const hoveringShape = this.editor.getOutermostSelectableShape(
					info.shape,
					(parent) => !selectedIds.includes(parent.id)
				)
				if (hoveringShape.id !== focusLayerId) {
					this.editor.setHoveredId(hoveringShape.id)
				}
				break
			}
		}
	}

	onPointerLeave: TLEventHandlers['onPointerLeave'] = (info) => {
		switch (info.target) {
			case 'shape': {
				this.editor.setHoveredId(null)
				break
			}
		}
	}

	onExit = () => {
		if (!this.editor.pageState.editingId) return
		const { editingId } = this.editor.pageState
		if (!editingId) return

		// Clear the editing shape
		this.editor.setEditingId(null)

		const shape = this.editor.getShapeById(editingId)!
		const util = this.editor.getShapeUtil(shape)

		// Check for changes on editing end
		util.onEditEnd?.(shape)
	}

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		switch (info.target) {
			case 'shape': {
				const { shape } = info

				const { editingId } = this.editor.pageState

				if (editingId) {
					if (shape.id === editingId) {
						return
					}

					const editingShape = this.editor.getShapeById(editingId)

					if (editingShape) {
						const editingShapeUtil = this.editor.getShapeUtil(editingShape)
						editingShapeUtil.onEditEnd?.(editingShape)

						const util = this.editor.getShapeUtil(shape)

						// If the user has clicked onto a different shape of the same type
						// which is available to edit, select it and begin editing it.
						if (
							shape.type === editingShape.type &&
							util.canEdit?.(shape) &&
							!this.editor.isShapeOrAncestorLocked(shape)
						) {
							this.editor.setEditingId(shape.id)
							this.editor.setHoveredId(shape.id)
							this.editor.setSelectedIds([shape.id])
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
