import { StateNode, TLEventHandlers } from '@tldraw/editor'
import { updateHoveredId } from '../../selection-logic/updateHoveredId'

export class EditingShape extends StateNode {
	static override id = 'editing_shape'

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		switch (info.target) {
			case 'shape':
			case 'canvas': {
				updateHoveredId(this.editor)
			}
		}
	}

	override onExit = () => {
		if (!this.editor.currentPageState.editingShapeId) return
		const { editingShapeId } = this.editor.currentPageState
		if (!editingShapeId) return

		// Clear the editing shape
		this.editor.setEditingShapeId(null)

		const shape = this.editor.getShape(editingShapeId)!
		const util = this.editor.getShapeUtil(shape)

		// Check for changes on editing end
		util.onEditEnd?.(shape)
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
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
