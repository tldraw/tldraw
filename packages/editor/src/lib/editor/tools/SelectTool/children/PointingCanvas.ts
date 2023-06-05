import { isShapeId } from '@tldraw/tlschema'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class PointingCanvas extends StateNode {
	static override id = 'pointing_canvas'

	onEnter = () => {
		const { inputs } = this.editor

		if (!inputs.shiftKey) {
			if (this.editor.selectedIds.length > 0) {
				this.editor.mark('selecting none')
				this.editor.selectNone()
			}
		}
	}

	_clickWasInsideFocusedGroup() {
		const { focusLayerId, inputs } = this.editor
		if (!isShapeId(focusLayerId)) {
			return false
		}
		const groupShape = this.editor.getShapeById(focusLayerId)
		if (!groupShape) {
			return false
		}
		const clickPoint = this.editor.getPointInShapeSpace(groupShape, inputs.currentPagePoint)
		const util = this.editor.getShapeUtil(groupShape)
		return util.hitTestPoint(groupShape, clickPoint)
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('brushing', info)
		}
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt = () => {
		this.parent.transition('idle', {})
	}

	private complete() {
		const { shiftKey } = this.editor.inputs
		if (!shiftKey) {
			this.editor.selectNone()
			if (!this._clickWasInsideFocusedGroup()) {
				this.editor.setFocusLayer(null)
			}
		}
		this.parent.transition('idle', {})
	}
}
