import {
	Group2d,
	HIT_TEST_MARGIN,
	StateNode,
	TLArrowShape,
	TLEventHandlers,
	TLGeoShape,
	TLPointerEventInfo,
	TLShape,
} from '@tldraw/editor'

export class PointingShape extends StateNode {
	static override id = 'pointing_shape'

	hitShape = {} as TLShape
	hitShapeForPointerUp = {} as TLShape

	didSelectOnEnter = false

	override onEnter = (info: TLPointerEventInfo & { target: 'shape' }) => {
		const {
			selectedShapeIds,
			focusedGroupId,
			selectionRotatedPageBounds: selectionBounds,
			inputs: { currentPagePoint, shiftKey, altKey },
		} = this.editor

		this.hitShape = info.shape
		const outermostSelectingShape = this.editor.getOutermostSelectableShape(info.shape)

		if (
			// If the shape has an onClick handler
			this.editor.getShapeUtil(info.shape).onClick ||
			// ...or if the shape is the focused layer (e.g. group)
			outermostSelectingShape.id === focusedGroupId ||
			// ...or if the shape is within the selection
			selectedShapeIds.includes(outermostSelectingShape.id) ||
			this.editor.isAncestorSelected(outermostSelectingShape.id) ||
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
				this.editor.mark('shift selecting shape')
				this.editor.setSelectedShapes([...selectedShapeIds, outermostSelectingShape.id])
			}
		} else {
			this.editor.mark('selecting shape')
			this.editor.setSelectedShapes([outermostSelectingShape.id])
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		const {
			zoomLevel,
			focusedGroupId,
			selectedShapeIds,
			inputs: { currentPagePoint, shiftKey },
		} = this.editor

		const hitShape =
			this.editor.getShapeAtPoint(currentPagePoint, {
				margin: HIT_TEST_MARGIN / zoomLevel,
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
					this.editor.mark('shape on click')
					this.editor.updateShapes([change])
					this.parent.transition('idle', info)
					return
				}
			}

			if (selectingShape.id === focusedGroupId) {
				if (selectedShapeIds.length > 0) {
					this.editor.mark('clearing shape ids')
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
				if (shiftKey) {
					this.editor.mark('deselecting on pointer up')
					this.editor.deselect(selectingShape)
				} else {
					if (selectedShapeIds.includes(selectingShape.id)) {
						// todo
						// if the shape is editable and we're inside of an editable part of that shape, e.g. the label of a geo shape,
						// then we would want to begin editing the shape. At the moment we're relying on the shape label's onPointerUp
						// handler to do this logic, and prevent the regular pointer up event, so we won't be here in that case.

						// ! tldraw hack
						// if the shape is a geo shape, and we're inside of the label, then we want to begin editing the label
						if (
							selectedShapeIds.length === 1 &&
							(this.editor.isShapeOfType<TLGeoShape>(selectingShape, 'geo') ||
								this.editor.isShapeOfType<TLArrowShape>(selectingShape, 'arrow'))
						) {
							const geometry = this.editor.getShapeGeometry(selectingShape)
							const labelGeometry = (geometry as Group2d).children[1]
							if (labelGeometry) {
								const pointInShapeSpace = this.editor.getPointInShapeSpace(
									selectingShape,
									currentPagePoint
								)

								if (
									labelGeometry.bounds.containsPoint(pointInShapeSpace, 0) &&
									labelGeometry.hitTestPoint(pointInShapeSpace)
								) {
									this.editor.batch(() => {
										this.editor.mark('editing on pointer up')
										this.editor.select(selectingShape.id)

										const util = this.editor.getShapeUtil(selectingShape)
										if (this.editor.instanceState.isReadonly) {
											if (!util.canEditInReadOnly(selectingShape)) {
												return
											}
										}

										this.editor.setEditingShape(selectingShape.id)
										this.editor.setCurrentTool('select.editing_shape')
									})
									return
								}
							}
						}

						// We just want to select the single shape from the selection
						this.editor.mark('selecting on pointer up')
						this.editor.select(selectingShape.id)
					} else {
						this.editor.mark('selecting on pointer up')
						this.editor.select(selectingShape)
					}
				}
			} else if (shiftKey) {
				// Different shape, so we are drilling down into a group with shift key held.
				// Deselect any ancestors and add the target shape to the selection
				const ancestors = this.editor.getShapeAncestors(outermostSelectableShape)

				this.editor.mark('shift deselecting on pointer up')
				this.editor.setSelectedShapes([
					...this.editor.selectedShapeIds.filter((id) => !ancestors.find((a) => a.id === id)),
					outermostSelectableShape.id,
				])
			} else {
				this.editor.mark('selecting on pointer up')
				// different shape and we are drilling down, but no shift held so just select it straight up
				this.editor.setSelectedShapes([outermostSelectableShape.id])
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
