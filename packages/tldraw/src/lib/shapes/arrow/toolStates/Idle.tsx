import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { clearArrowTargetState, updateArrowTargetState } from '../arrowTarget'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerMove(info: TLPointerEventInfo) {
		updateArrowTargetState({
			editor: this.editor,
			pointInPageSpace: this.editor.inputs.currentPagePoint,
			arrow: undefined,
			isPrecise: false,
			isExact: this.editor.inputs.altKey,
			currentBinding: undefined,
			otherBinding: undefined,
			terminal: 'start',
			isCreatingShape: true,
		})
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
		updateArrowTargetState({
			editor: this.editor,
			pointInPageSpace: this.editor.inputs.currentPagePoint,
			arrow: undefined,
			isPrecise: false,
			isExact: this.editor.inputs.altKey,
			currentBinding: undefined,
			otherBinding: undefined,
			terminal: 'start',
			isCreatingShape: true,
		})
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}

	override onExit() {
		clearArrowTargetState(this.editor)
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
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
}
