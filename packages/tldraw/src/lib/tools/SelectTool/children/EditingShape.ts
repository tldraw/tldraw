import { StateNode, TLEventHandlers } from '@tldraw/editor'

export class EditingShape extends StateNode {
	static override id = 'editing_shape'

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		switch (info.target) {
			case 'shape':
			case 'canvas': {
				this.editor.updateHoveredId()
			}
		}
	}

	override onExit = () => {
		if (!this.editor.currentPageState.editingId) return
		const { editingId } = this.editor.currentPageState
		if (!editingId) return

		// Clear the editing shape
		this.editor.setEditingId(null)

		const shape = this.editor.getShape(editingId)!
		const util = this.editor.getShapeUtil(shape)

		// Check for changes on editing end
		util.onEditEnd?.(shape)
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		switch (info.target) {
			case 'canvas': {
				const hitShape =
					this.editor.hoveredShape ??
					this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint)
				if (hitShape) {
					this.onPointerDown({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}
				break
			}
			case 'shape': {
				const { shape } = info

				const { editingId } = this.editor.currentPageState

				if (editingId) {
					if (shape.id === editingId) {
						return
					}

					const editingShape = this.editor.getShape(editingId)

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

	override onComplete: TLEventHandlers['onComplete'] = (info) => {
		this.parent.transition('idle', info)
	}

	override onCancel: TLEventHandlers['onCancel'] = (info) => {
		this.parent.transition('idle', info)
	}
}
