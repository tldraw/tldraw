import { isShapeId } from '@tldraw/tlschema'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class PointingCanvas extends StateNode {
	static override id = 'pointing_canvas'

	onEnter = () => {
		const { inputs } = this.app

		if (!inputs.shiftKey) {
			if (this.app.selectedIds.length > 0) {
				this.app.mark('selecting none')
				this.app.selectNone()
			}
		}
	}

	_clickWasInsideFocusedGroup() {
		const { focusLayerId, inputs } = this.app
		if (!isShapeId(focusLayerId)) {
			return false
		}
		const groupShape = this.app.getShapeById(focusLayerId)
		if (!groupShape) {
			return false
		}
		const clickPoint = this.app.getPointInShapeSpace(groupShape, inputs.currentPagePoint)
		const util = this.app.getShapeUtil(groupShape)
		return util.hitTestPoint(groupShape, clickPoint)
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.app.inputs.isDragging) {
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
		const { shiftKey } = this.app.inputs
		if (!shiftKey) {
			this.app.selectNone()
			if (!this._clickWasInsideFocusedGroup()) {
				this.app.setFocusLayer(null)
			}
		}
		this.parent.transition('idle', {})
	}
}
