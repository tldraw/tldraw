import { StateNode, TLEventHandlers, isShapeId } from '@tldraw/editor'

export class PointingCanvas extends StateNode {
	static override id = 'pointing_canvas'

	override onEnter = () => {
		const { inputs } = this.editor

		if (!inputs.shiftKey) {
			if (this.editor.selectedIds.length > 0) {
				this.editor.mark('selecting none')
				this.editor.selectNone()
			}
		}
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('brushing', info)
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
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
				this.editor.focusLayerId = this.editor.currentPageId
			}
		}
		this.parent.transition('idle', {})
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
		return this.editor.getGeometry(groupShape).hitTestPoint(clickPoint, this.editor.zoomLevel)
	}
}
