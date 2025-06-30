import { StateNode, TLPointerEventInfo, TLShape } from '@tldraw/editor'
import { isOverArrowLabel } from '../../../shapes/arrow/arrowLabel'
import { getTextLabels } from '../../../utils/shapes/shapes'

export class PointingShape extends StateNode {
	static override id = 'pointing_shape'

	hitShape = {} as TLShape
	hitShapeForPointerUp = {} as TLShape
	isDoubleClick = false

	didCtrlOnEnter = false
	didSelectOnEnter = false

	override onEnter(info: TLPointerEventInfo & { target: 'shape' }) {
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		const selectionBounds = this.editor.getSelectionRotatedPageBounds()
		const focusedGroupId = this.editor.getFocusedGroupId()
		const {
			inputs: { currentPagePoint },
		} = this.editor
		const { shiftKey, altKey, accelKey } = info

		this.hitShape = info.shape
		this.isDoubleClick = false
		this.didCtrlOnEnter = accelKey
		const outermostSelectingShape = this.editor.getOutermostSelectableShape(info.shape)
		const selectedAncestor = this.editor.findShapeAncestor(outermostSelectingShape, (parent) =>
			selectedShapeIds.includes(parent.id)
		)

		if (
			this.didCtrlOnEnter ||
			// If the shape has an onClick handler
			this.editor.getShapeUtil(info.shape).onClick ||
			// ...or if the shape is the focused layer (e.g. group)
			outermostSelectingShape.id === focusedGroupId ||
			// ...or if the shape is within the selection
			selectedShapeIds.includes(outermostSelectingShape.id) ||
			// ...or if an ancestor of the shape is selected
			selectedAncestor ||
			// ...or if the current point is NOT within the selection bounds
			(selectedShapeIds.length > 1 && selectionBounds?.containsPoint(currentPagePoint))
		) {
			// We won't select the shape on enter, though we might select it on pointer up!
			this.didSelectOnEnter = false
			this.hitShapeForPointerUp = outermostSelectingShape
			return
		}

		this.didSelectOnEnter = true

		if (shiftKey && !altKey) {
			this.editor.cancelDoubleClick()
			if (!selectedShapeIds.includes(outermostSelectingShape.id)) {
				this.editor.markHistoryStoppingPoint('shift selecting shape')
				this.editor.setSelectedShapes([...selectedShapeIds, outermostSelectingShape.id])
			}
		} else {
			this.editor.markHistoryStoppingPoint('selecting shape')
			this.editor.setSelectedShapes([outermostSelectingShape.id])
		}
	}

	override onPointerUp(info: TLPointerEventInfo) {
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		const focusedGroupId = this.editor.getFocusedGroupId()
		const zoomLevel = this.editor.getZoomLevel()
		const {
			inputs: { currentPagePoint },
		} = this.editor

		const additiveSelectionKey = info.shiftKey || info.accelKey

		const hitShape =
			this.editor.getShapeAtPoint(currentPagePoint, {
				margin: this.editor.options.hitTestMargin / zoomLevel,
				hitInside: true,
				renderingOnly: true,
			}) ?? this.hitShape

		const selectingShape = hitShape
			? this.editor.getOutermostSelectableShape(hitShape)
			: this.hitShapeForPointerUp

		if (selectingShape) {
			// If the selecting shape has a click handler, call it instead of selecting the shape
			const util = this.editor.getShapeUtil(selectingShape)
			if (util.onClick) {
				const change = util.onClick?.(selectingShape)
				if (change) {
					this.editor.markHistoryStoppingPoint('shape on click')
					this.editor.updateShapes([change])
					this.parent.transition('idle', info)
					return
				}
			}

			if (selectingShape.id === focusedGroupId) {
				if (selectedShapeIds.length > 0) {
					this.editor.markHistoryStoppingPoint('clearing shape ids')
					this.editor.setSelectedShapes([])
				} else {
					this.editor.popFocusedGroupId()
				}
				this.parent.transition('idle', info)
				return
			}
		}

		if (!this.didSelectOnEnter) {
			// if the shape has an ancestor which is a focusable layer and it is not focused but it is selected
			// then we should focus the layer and select the shape

			const outermostSelectableShape = this.editor.getOutermostSelectableShape(
				hitShape,
				// if a group is selected, we want to stop before reaching that group
				// so we can drill down into the group
				(parent) => !selectedShapeIds.includes(parent.id)
			)

			// If the outermost shape is selected, then either select or deselect the SELECTING shape
			if (selectedShapeIds.includes(outermostSelectableShape.id)) {
				// same shape, so deselect it if shift is pressed, otherwise deselect all others
				if (additiveSelectionKey) {
					this.editor.markHistoryStoppingPoint('deselecting on pointer up')
					this.editor.deselect(selectingShape)
				} else {
					if (selectedShapeIds.includes(selectingShape.id)) {
						// todo
						// if the shape is editable and we're inside of an editable part of that shape, e.g. the label of a geo shape,
						// then we would want to begin editing the shape. At the moment we're relying on the shape label's onPointerUp
						// handler to do this logic, and prevent the regular pointer up event, so we won't be here in that case.

						// if the shape has a text label, and we're inside of the label, then we want to begin editing the label.
						if (selectedShapeIds.length === 1) {
							const geometry = this.editor.getShapeUtil(selectingShape).getGeometry(selectingShape)
							const textLabels = getTextLabels(geometry)
							const textLabel = textLabels.length === 1 ? textLabels[0] : undefined
							// N.B. we're only interested if there is exactly one text label. We don't handle the
							// case if there's potentially more than one text label at the moment.
							if (textLabel) {
								const pointInShapeSpace = this.editor.getPointInShapeSpace(
									selectingShape,
									currentPagePoint
								)

								if (
									textLabel.bounds.containsPoint(pointInShapeSpace, 0) &&
									textLabel.hitTestPoint(pointInShapeSpace)
								) {
									this.editor.run(() => {
										this.editor.markHistoryStoppingPoint('editing on pointer up')
										this.editor.select(selectingShape.id)

										const util = this.editor.getShapeUtil(selectingShape)
										if (this.editor.getIsReadonly()) {
											if (!util.canEditInReadonly(selectingShape)) {
												return
											}
										}

										this.editor.setEditingShape(selectingShape.id)
										this.editor.setCurrentTool('select.editing_shape')

										if (this.isDoubleClick) {
											this.editor.emit('select-all-text', { shapeId: selectingShape.id })
										} else {
											this.editor.emit('place-caret', {
												shapeId: selectingShape.id,
												point: info.point,
											})
										}
									})
									return
								}
							}
						}

						// We just want to select the single shape from the selection
						this.editor.markHistoryStoppingPoint('selecting on pointer up')
						this.editor.select(selectingShape.id)
					} else {
						this.editor.markHistoryStoppingPoint('selecting on pointer up')
						this.editor.select(selectingShape)
					}
				}
			} else if (additiveSelectionKey) {
				// Different shape, so we are drilling down into a group with shift key held.
				// Deselect any ancestors and add the target shape to the selection
				const ancestors = this.editor.getShapeAncestors(outermostSelectableShape)

				this.editor.markHistoryStoppingPoint('shift deselecting on pointer up')
				this.editor.setSelectedShapes([
					...this.editor.getSelectedShapeIds().filter((id) => !ancestors.find((a) => a.id === id)),
					outermostSelectableShape.id,
				])
			} else {
				this.editor.markHistoryStoppingPoint('selecting on pointer up')
				// different shape and we are drilling down, but no shift held so just select it straight up
				this.editor.setSelectedShapes([outermostSelectableShape.id])
			}
		}

		this.parent.transition('idle', info)
	}

	override onDoubleClick() {
		this.isDoubleClick = true
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.isDragging) {
			if (isOverArrowLabel(this.editor, this.hitShape)) {
				// We're moving the label on a shape.
				this.parent.transition('pointing_arrow_label', { ...info, shape: this.hitShape })
				return
			}

			if (this.didCtrlOnEnter) {
				this.parent.transition('brushing', info)
			} else {
				this.startTranslating(info)
			}
		}
	}

	override onLongPress(info: TLPointerEventInfo) {
		this.startTranslating(info)
	}

	private startTranslating(info: TLPointerEventInfo) {
		if (this.editor.getIsReadonly()) return

		// Re-focus the editor, just in case the text label of the shape has stolen focus
		this.editor.focus()
		this.parent.transition('translating', info)
	}

	override onCancel() {
		this.cancel()
	}
	override onComplete() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private cancel() {
		this.parent.transition('idle')
	}
}
