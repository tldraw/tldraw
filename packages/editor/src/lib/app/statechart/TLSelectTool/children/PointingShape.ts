import { TLShape } from '@tldraw/tlschema'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class PointingShape extends StateNode {
	static override id = 'pointing_shape'

	eventTargetShape = {} as TLShape
	selectingShape = {} as TLShape

	didSelectOnEnter = false

	onEnter = (info: TLPointerEventInfo & { target: 'shape' }) => {
		this.eventTargetShape = info.shape
		this.selectingShape = this.app.getOutermostSelectableShape(info.shape)

		const util = this.app.getShapeUtil(info.shape)

		if (util.onClick || this.selectingShape.id === this.app.focusLayerId) {
			this.didSelectOnEnter = false
			return
		}

		const isSelected = this.app.isWithinSelection(this.selectingShape.id)

		const isBehindSelectionBounds =
			this.app.selectedIds.length > 1 && // only on 2+ selected shapes!
			this.app.selectionBounds?.containsPoint(this.app.inputs.currentPagePoint)

		this.didSelectOnEnter =
			!isSelected && this.selectingShape.id !== this.app.focusLayerId && !isBehindSelectionBounds

		if (this.didSelectOnEnter) {
			const { inputs, selectedIds } = this.app

			const parent = this.app.getParentShape(info.shape)

			if (parent && parent.type === 'group') {
				this.app.cancelDoubleClick()
			}

			if (inputs.shiftKey && !inputs.altKey) {
				if (!selectedIds.includes(this.selectingShape.id)) {
					this.app.mark('shift selecting shape')
					this.app.setSelectedIds([...selectedIds, this.selectingShape.id])
				}
			} else {
				this.app.mark('selecting shape')
				this.app.setSelectedIds([this.selectingShape.id])
			}
		}
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		const { shape } = info

		if (shape) {
			const util = this.app.getShapeUtil(shape)
			if (util.onClick) {
				const change = util.onClick?.(shape)
				if (change) {
					this.app.updateShapes([change])
					this.parent.transition('idle', info)
					return
				}
			}
		}

		if (!this.didSelectOnEnter && this.selectingShape.id !== this.app.focusLayerId) {
			this.app.mark('selecting shape (pointer up)')
			// if the shape has an ancestor which is a focusable layer and it is not focused but it is selected
			// then we should focus the layer and select the shape

			const targetShape = this.app.getOutermostSelectableShape(
				this.eventTargetShape,
				// if a group is selected, we want to stop before reaching that group
				// so we can drill down into the group
				(parent) => !this.app.isSelected(parent.id)
			)

			if (this.app.selectedIds.includes(targetShape.id)) {
				// same shape, so deselect it if shift is pressed, otherwise deselect all others
				this.app.setSelectedIds(
					this.app.inputs.shiftKey
						? this.app.selectedIds.filter((id) => id !== this.selectingShape.id)
						: [this.selectingShape.id]
				)
			} else if (this.app.inputs.shiftKey) {
				// Different shape, so we are drilling down into a group with shift key held.
				// Deselect any ancestors and add the target shape to the selection
				const ancestors = this.app.getAncestors(targetShape)

				this.app.setSelectedIds([
					...this.app.selectedIds.filter((id) => !ancestors.find((a) => a.id === id)),
					targetShape.id,
				])
			} else {
				// different shape and we are drilling down, but no shift held so just select it straight up
				this.app.setSelectedIds([targetShape.id])
			}
		} else if (this.selectingShape.id === this.app.focusLayerId) {
			// clicking the 'background' of a focused group should deselect. equivalent to a click on the canvas
			if (this.app.selectedIds.length > 0) {
				this.app.setSelectedIds([])
			} else {
				this.app.popFocusLayer()
			}
		}

		this.parent.transition('idle', info)
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.app.inputs.isDragging) {
			if (this.app.isReadOnly) return
			this.parent.transition('translating', info)
		}
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt = () => {
		this.cancel()
	}

	private cancel() {
		this.parent.transition('idle', {})
	}
}
