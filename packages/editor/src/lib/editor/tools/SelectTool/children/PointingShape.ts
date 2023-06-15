import { TLShape } from '@tldraw/tlschema'
import { GroupShapeUtil } from '../../../shapes/group/GroupShapeUtil'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class PointingShape extends StateNode {
	static override id = 'pointing_shape'

	eventTargetShape = {} as TLShape
	selectingShape = {} as TLShape

	didSelectOnEnter = false

	onEnter = (info: TLPointerEventInfo & { target: 'shape' }) => {
		this.eventTargetShape = info.shape
		this.selectingShape = this.editor.getOutermostSelectableShape(info.shape)

		const util = this.editor.getShapeUtil(info.shape)

		if (util.onClick || this.selectingShape.id === this.editor.focusLayerId) {
			this.didSelectOnEnter = false
			return
		}

		const isSelected = this.editor.isWithinSelection(this.selectingShape.id)

		const isBehindSelectionBounds =
			this.editor.selectedIds.length > 1 && // only on 2+ selected shapes!
			this.editor.selectionBounds?.containsPoint(this.editor.inputs.currentPagePoint)

		this.didSelectOnEnter =
			!isSelected && this.selectingShape.id !== this.editor.focusLayerId && !isBehindSelectionBounds

		if (this.didSelectOnEnter) {
			const { inputs, selectedIds } = this.editor

			const parent = this.editor.getParentShape(info.shape)

			if (parent && this.editor.isShapeOfType(parent, GroupShapeUtil)) {
				this.editor.cancelDoubleClick()
			}

			if (inputs.shiftKey && !inputs.altKey) {
				if (!selectedIds.includes(this.selectingShape.id)) {
					this.editor.mark('shift selecting shape')
					this.editor.setSelectedIds([...selectedIds, this.selectingShape.id])
				}
			} else {
				this.editor.mark('selecting shape')
				this.editor.setSelectedIds([this.selectingShape.id])
			}
		}
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		const { shape } = info

		if (shape) {
			const util = this.editor.getShapeUtil(shape)
			if (util.onClick) {
				const change = util.onClick?.(shape)
				if (change) {
					this.editor.updateShapes([change])
					this.parent.transition('idle', info)
					return
				}
			}
		}

		if (!this.didSelectOnEnter && this.selectingShape.id !== this.editor.focusLayerId) {
			this.editor.mark('selecting shape (pointer up)')
			// if the shape has an ancestor which is a focusable layer and it is not focused but it is selected
			// then we should focus the layer and select the shape

			const targetShape = this.editor.getOutermostSelectableShape(
				this.eventTargetShape,
				// if a group is selected, we want to stop before reaching that group
				// so we can drill down into the group
				(parent) => !this.editor.isSelected(parent.id)
			)

			if (this.editor.selectedIds.includes(targetShape.id)) {
				// same shape, so deselect it if shift is pressed, otherwise deselect all others
				this.editor.setSelectedIds(
					this.editor.inputs.shiftKey
						? this.editor.selectedIds.filter((id) => id !== this.selectingShape.id)
						: [this.selectingShape.id]
				)
			} else if (this.editor.inputs.shiftKey) {
				// Different shape, so we are drilling down into a group with shift key held.
				// Deselect any ancestors and add the target shape to the selection
				const ancestors = this.editor.getAncestors(targetShape)

				this.editor.setSelectedIds([
					...this.editor.selectedIds.filter((id) => !ancestors.find((a) => a.id === id)),
					targetShape.id,
				])
			} else {
				// different shape and we are drilling down, but no shift held so just select it straight up
				this.editor.setSelectedIds([targetShape.id])
			}
		} else if (this.selectingShape.id === this.editor.focusLayerId) {
			// clicking the 'background' of a focused group should deselect. equivalent to a click on the canvas
			if (this.editor.selectedIds.length > 0) {
				this.editor.setSelectedIds([])
			} else {
				this.editor.popFocusLayer()
			}
		}

		this.parent.transition('idle', info)
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			if (this.editor.isReadOnly) return
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
