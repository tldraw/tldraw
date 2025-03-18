import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { findArrowTargetInfoAtPoint } from '@tldraw/editor/src/lib/arrows/target'
import { ReactNode } from 'react'
import { TargetHandleOverlay } from '../TargetHandleOverlay'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onPointerMove(info: TLPointerEventInfo) {
		this.updateHover()
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
		this.updateHover()
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}

	override onExit() {
		this.editor.setArrowHints(null)
		this.editor.setHintingShapes([])
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

	override getSvgOverlay(): ReactNode {
		return <TargetHandleOverlay arrow={null} />
	}

	private updateHover() {
		const targetInfo = findArrowTargetInfoAtPoint(
			this.editor,
			null,
			this.editor.inputs.currentPagePoint
		)
		if (targetInfo) {
			if (!targetInfo.closestHandle || targetInfo.closestHandle.side === null) {
				this.editor.setHintingShapes([targetInfo.target.id])
				this.editor.setArrowHints({
					arrowShapeId: null,
					targetShapeId: targetInfo.target.id,
					hoverSide: null,
				})
			} else {
				this.editor.setHintingShapes([])
				this.editor.setArrowHints({
					arrowShapeId: null,
					targetShapeId: targetInfo.target.id,
					hoverSide: targetInfo.closestHandle.side,
				})
			}
		} else {
			this.editor.setHintingShapes([])
			this.editor.setArrowHints(null)
		}
	}
}
