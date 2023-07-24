import {
	HIT_TEST_MARGIN,
	StateNode,
	TLEventHandlers,
	TLPointerEventInfo,
	TLShape,
} from '@tldraw/editor'

export class PointingShape extends StateNode {
	static override id = 'pointing_shape'

	eventTargetShape = {} as TLShape
	selectingShape = {} as TLShape

	didSelectOnEnter = false

	override onEnter = (info: TLPointerEventInfo & { target: 'shape' }) => {
		this.eventTargetShape = info.shape

		this.selectingShape = this.editor.getOutermostSelectableShape(info.shape)
		if (this.selectingShape !== info.shape) {
			this.editor.cancelDoubleClick()
		}

		const util = this.editor.getShapeUtil(info.shape)

		if (util.onClick || this.selectingShape.id === this.editor.focusLayerId) {
			this.didSelectOnEnter = false
			return
		}

		const isWithinSelection =
			this.editor.selectedIds.includes(this.selectingShape.id) ||
			this.editor.isAncestorSelected(this.selectingShape.id)

		const isBehindSelectionBounds =
			this.editor.selectedIds.length > 1 && // only on 2+ selected shapes!
			this.editor.selectionBounds?.containsPoint(this.editor.inputs.currentPagePoint)

		this.didSelectOnEnter =
			!isWithinSelection &&
			this.selectingShape.id !== this.editor.focusLayerId &&
			!isBehindSelectionBounds

		if (this.didSelectOnEnter) {
			const { inputs, selectedIds } = this.editor

			// const parent = this.editor.getParentShape(info.shape)

			// if (parent && this.editor.isShapeOfType<TLGroupShape>(parent, 'group')) {
			// 	this.editor.cancelDoubleClick()
			// }

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

	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		// const { shape } = info

		const hitShape =
			this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
				margin: HIT_TEST_MARGIN / this.editor.zoomLevel,
				hitInside: true,
			}) ?? this.eventTargetShape

		const selectingShape = hitShape
			? this.editor.getOutermostSelectableShape(hitShape)
			: this.selectingShape

		if (selectingShape) {
			const util = this.editor.getShapeUtil(selectingShape)
			if (util.onClick) {
				const change = util.onClick?.(selectingShape)
				if (change) {
					this.editor.updateShapes([change])
					this.parent.transition('idle', info)
					return
				}
			}
		}

		if (!this.didSelectOnEnter && selectingShape.id !== this.editor.focusLayerId) {
			this.editor.mark('selecting shape (pointer up)')
			// if the shape has an ancestor which is a focusable layer and it is not focused but it is selected
			// then we should focus the layer and select the shape

			const { selectedIds } = this.editor
			const targetShape = this.editor.getOutermostSelectableShape(
				hitShape,
				// if a group is selected, we want to stop before reaching that group
				// so we can drill down into the group
				(parent) => !selectedIds.includes(parent.id)
			)

			if (this.editor.selectedIds.includes(targetShape.id)) {
				// same shape, so deselect it if shift is pressed, otherwise deselect all others
				this.editor.setSelectedIds(
					this.editor.inputs.shiftKey
						? this.editor.selectedIds.filter((id) => id !== selectingShape.id)
						: [selectingShape.id]
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
		} else if (selectingShape.id === this.editor.focusLayerId) {
			// clicking the 'background' of a focused group should deselect. equivalent to a click on the canvas
			if (this.editor.selectedIds.length > 0) {
				this.editor.setSelectedIds([])
			} else {
				this.editor.popFocusLayer()
			}
		}

		this.parent.transition('idle', info)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			if (this.editor.instanceState.isReadonly) return
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
