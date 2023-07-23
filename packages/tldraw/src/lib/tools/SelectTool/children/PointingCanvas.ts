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
		const hitShape =
			this.editor.hoveredShape ??
			this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
				hitInside: true,
				margin: 0,
			})

		const { shiftKey } = this.editor.inputs

		if (hitShape) {
			const util = this.editor.getShapeUtil(hitShape)

			if (hitShape.id !== this.editor.focusLayerId) {
				if (util.onClick) {
					util.onClick(hitShape)
				} else {
					const isWithinSelection =
						this.editor.selectedIds.includes(hitShape.id) ||
						this.editor.isAncestorSelected(hitShape.id)

					const isBehindSelectionBounds =
						this.editor.selectedIds.length > 1 && // only on 2+ selected shapes!
						this.editor.selectionBounds?.containsPoint(this.editor.inputs.currentPagePoint)

					if (
						!isWithinSelection &&
						hitShape.id !== this.editor.focusLayerId &&
						!isBehindSelectionBounds
					) {
						const { inputs, selectedIds } = this.editor

						// const parent = this.editor.getParentShape(hitShape)

						// if (parent && this.editor.isShapeOfType<TLGroupShape>(parent, 'group')) {
						// 	this.editor.cancelDoubleClick()
						// }

						if (inputs.shiftKey && !inputs.altKey) {
							if (!selectedIds.includes(hitShape.id)) {
								this.editor.mark('shift selecting shape')
								this.editor.setSelectedIds([...selectedIds, hitShape.id])
							}
						} else {
							this.editor.mark('selecting shape')
							this.editor.setSelectedIds([hitShape.id])
						}
					}
				}
			}
		} else {
			if (!shiftKey) {
				this.editor.selectNone()
				if (!this._clickWasInsideFocusedGroup()) {
					this.editor.setFocusLayerId(this.editor.currentPageId)
				}
			}
		}

		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt = () => {
		this.parent.transition('idle', {})
	}

	private complete() {
		this.parent.transition('idle', {})
	}

	_clickWasInsideFocusedGroup() {
		const { focusLayerId, inputs } = this.editor
		if (!isShapeId(focusLayerId)) {
			return false
		}
		const groupShape = this.editor.getShape(focusLayerId)
		if (!groupShape) {
			return false
		}
		const clickPoint = this.editor.getPointInShapeSpace(groupShape, inputs.currentPagePoint)
		return this.editor.getGeometry(groupShape).hitTestPoint(clickPoint, this.editor.zoomLevel)
	}
}
