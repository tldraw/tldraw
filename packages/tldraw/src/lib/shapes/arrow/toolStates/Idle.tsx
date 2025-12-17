import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo, TLShapeId } from '@tldraw/editor'
import { startEditingShapeWithRichText } from '../../../tools/SelectTool/selectHelpers'
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
			const onlySelectedShape = this.editor.getOnlySelectedShape()
			if (this.editor.canEditShape(onlySelectedShape)) {
				startEditingShapeWithRichText(this.editor, onlySelectedShape, { selectAll: true })
			}
		}
	}

	update() {
		const arrowUtil = this.editor.getShapeUtil<ArrowShapeUtil>('arrow')

		const targetState = updateArrowTargetState({
			editor: this.editor,
			pointInPageSpace: this.editor.inputs.getCurrentPagePoint(),
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
