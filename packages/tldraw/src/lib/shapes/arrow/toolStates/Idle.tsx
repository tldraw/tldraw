import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo, TLShapeId } from '@tldraw/editor'
import { ArrowShapeUtil } from '../ArrowShapeUtil'
import { clearArrowTargetState, updateArrowTargetState } from '../arrowTargetState'

export class Idle extends StateNode {
	static override id = 'idle'

	isPrecise = false
	isPreciseTimerId: number | null = null
	preciseTargetId: TLShapeId | null = null

	override onPointerMove() {
		this.update()
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', { ...info, isPrecise: this.isPrecise })
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
		this.update()
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}

	override onExit() {
		clearArrowTargetState(this.editor)
		if (this.isPreciseTimerId !== null) {
			clearTimeout(this.isPreciseTimerId)
		}
	}

	override onKeyDown() {
		this.update()
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		this.update()
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

	update() {
		const arrowUtil = this.editor.getShapeUtil<ArrowShapeUtil>('arrow')

		const targetState = updateArrowTargetState({
			editor: this.editor,
			pointInPageSpace: this.editor.inputs.currentPagePoint,
			arrow: undefined,
			isPrecise: this.isPrecise,
			currentBinding: undefined,
			oppositeBinding: undefined,
		})

		if (targetState && targetState.target.id !== this.preciseTargetId) {
			if (this.isPreciseTimerId !== null) {
				clearTimeout(this.isPreciseTimerId)
			}

			this.preciseTargetId = targetState.target.id
			this.isPreciseTimerId = this.editor.timers.setTimeout(() => {
				this.isPrecise = true
				this.update()
			}, arrowUtil.options.hoverPreciseTimeout)
		} else if (!targetState && this.preciseTargetId) {
			this.isPrecise = false
			this.preciseTargetId = null
			if (this.isPreciseTimerId !== null) {
				clearTimeout(this.isPreciseTimerId)
			}
		}
	}
}
