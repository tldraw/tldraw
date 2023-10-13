import { StateNode, TLEventHandlers } from '@tldraw/editor'

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
			if (this.editor.instanceState.isReadonly) return null

			const { onlySelectedShape } = this.editor
			// If the only selected shape is editable, start editing it
			if (
				onlySelectedShape &&
				this.editor.getShapeUtil(onlySelectedShape).canEdit(onlySelectedShape)
			) {
				this.editor.setCurrentTool('select')
				this.editor.setEditingShape(onlySelectedShape.id)
				this.editor.root.current.value!.transition('editing_shape', {
					...info,
					target: 'shape',
					shape: onlySelectedShape,
				})
			}
		}
	}

	override onCancel = () => {
		this.editor.setCurrentTool('select')
	}
}
