import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { updateHoveredShapeId } from '../../../tools/selection-logic/updateHoveredShapeId'

export class Idle extends StateNode {
	static override id = 'idle'
	_cancel: { cancel(): void } | undefined

	override onPointerMove(info: TLPointerEventInfo) {
		switch (info.target) {
			case 'shape':
			case 'canvas': {
				this._cancel = updateHoveredShapeId(this.editor)
			}
		}
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this._cancel?.cancel()
		this._cancel = undefined
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
		if (info.key === 'Enter') {
			if (this.editor.getIsReadonly()) return null
			const onlySelectedShape = this.editor.getOnlySelectedShape()
			// If the only selected shape is editable, start editing it
			if (
				onlySelectedShape &&
				this.editor.getShapeUtil(onlySelectedShape).canEdit(onlySelectedShape)
			) {
				this.editor.setCurrentTool('select')
				this.editor.setEditingShape(onlySelectedShape.id)
				this.editor.root.getCurrent()?.transition('editing_shape', {
					...info,
					target: 'shape',
					shape: onlySelectedShape,
				})
			}
		}
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
