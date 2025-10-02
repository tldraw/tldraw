import {
	Editor,
	StateNode,
	TLAdjacentDirection,
	TLClickEventInfo,
	TLGroupShape,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
	TLShape,
	TLTextShape,
	Vec,
	VecLike,
	createShapeId,
	debugFlags,
	kickoutOccludedShapes,
	pointInPolygon,
	toRichText,
} from '@tldraw/editor'
import { isOverArrowLabel } from '../../../shapes/arrow/arrowLabel'
import { getHitShapeOnCanvasPointerDown } from '../../selection-logic/getHitShapeOnCanvasPointerDown'
import { getShouldEnterCropMode } from '../../selection-logic/getShouldEnterCropModeOnPointerDown'
import { selectOnCanvasPointerUp } from '../../selection-logic/selectOnCanvasPointerUp'
import { updateHoveredShapeId } from '../../selection-logic/updateHoveredShapeId'
import { startEditingShapeWithLabel } from '../selectHelpers'

const SKIPPED_KEYS_FOR_AUTO_EDITING = [
	'Delete',
	'Backspace',
	'[',
	']',
	'Enter',
	' ',
	'Shift',
	'Tab',
]

export class Idle extends StateNode {
	static override id = 'idle'

	selectedShapesOnKeyDown: TLShape[] = []

	override onEnter() {
		this.parent.setCurrentToolIdMask(undefined)
		updateHoveredShapeId(this.editor)
		this.selectedShapesOnKeyDown = []
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onExit() {
		updateHoveredShapeId.cancel()
	}

	override onPointerMove() {
		updateHoveredShapeId(this.editor)
	}

	override onPointerDown(info: TLPointerEventInfo) {
		const shouldEnterCropMode = info.ctrlKey && getShouldEnterCropMode(this.editor)

		switch (info.target) {
			case 'canvas': {
				// Check to see if we hit any shape under the pointer; if so,
				// handle this as a pointer down on the shape instead of the canvas
				const hitShape = getHitShapeOnCanvasPointerDown(this.editor)
				if (hitShape && !hitShape.isLocked) {
					this.onPointerDown({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}

				const selectedShapeIds = this.editor.getSelectedShapeIds()
				const onlySelectedShape = this.editor.getOnlySelectedShape()
				const {
					inputs: { currentPagePoint },
				} = this.editor

				if (
					selectedShapeIds.length > 1 ||
					(onlySelectedShape &&
						!this.editor.getShapeUtil(onlySelectedShape).hideSelectionBoundsBg(onlySelectedShape))
				) {
					if (isPointInRotatedSelectionBounds(this.editor, currentPagePoint)) {
						this.onPointerDown({
							...info,
							target: 'selection',
						})
						return
					}
				}

				this.parent.transition('pointing_canvas', info)
				break
			}
			case 'shape': {
				const { shape } = info

				if (this.editor.isShapeOrAncestorLocked(shape)) {
					this.parent.transition('pointing_canvas', info)
					break
				}

				// If we're holding ctrl key, we might select it, or start brushing...
				this.parent.transition('pointing_shape', info)
				break
			}
			case 'handle': {
				if (this.editor.getIsReadonly()) break
				if (this.editor.inputs.altKey) {
					this.parent.transition('pointing_shape', info)
				} else {
					// If we're holding ctrl key, we might select it, or start brushing...
					this.parent.transition('pointing_handle', info)
				}
				break
			}
			case 'selection': {
				switch (info.handle) {
					case 'mobile_rotate':
					case 'top_left_rotate':
					case 'top_right_rotate':
					case 'bottom_left_rotate':
					case 'bottom_right_rotate': {
						if (info.accelKey) {
							this.parent.transition('brushing', info)
							break
						}
						this.parent.transition('pointing_rotate_handle', info)
						break
					}
					case 'top':
					case 'right':
					case 'bottom':
					case 'left':
					case 'top_left':
					case 'top_right':
					case 'bottom_left':
					case 'bottom_right': {
						if (shouldEnterCropMode) {
							this.parent.transition('crop.pointing_crop_handle', info)
						} else {
							if (info.accelKey) {
								this.parent.transition('brushing', info)
								break
							}
							this.parent.transition('pointing_resize_handle', info)
						}
						break
					}
					default: {
						const hoveredShape = this.editor.getHoveredShape()
						if (
							hoveredShape &&
							!this.editor.getSelectedShapeIds().includes(hoveredShape.id) &&
							!hoveredShape.isLocked
						) {
							this.onPointerDown({
								...info,
								shape: hoveredShape,
								target: 'shape',
							})
							return
						}

						this.parent.transition('pointing_selection', info)
					}
				}
				break
			}
		}
	}

	override onDoubleClick(info: TLClickEventInfo) {
		if (this.editor.inputs.shiftKey || info.phase !== 'up') return

		// We don't want to double click while toggling shapes
		if (info.ctrlKey || info.shiftKey) return

		switch (info.target) {
			case 'canvas': {
				const hoveredShape = this.editor.getHoveredShape()

				// todo
				// double clicking on the middle of a hollow geo shape without a label, or
				// over the label of a hollwo shape that has a label, should start editing
				// that shape's label. We can't support "double click anywhere inside"
				// of the shape yet because that also creates text shapes, and can produce
				// unexpected results when working "inside of" a hollow shape.

				const hitShape =
					hoveredShape && !this.editor.isShapeOfType<TLGroupShape>(hoveredShape, 'group')
						? hoveredShape
						: (this.editor.getSelectedShapeAtPoint(this.editor.inputs.currentPagePoint) ??
							this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
								margin: this.editor.options.hitTestMargin / this.editor.getZoomLevel(),
								hitInside: false,
							}))

				const focusedGroupId = this.editor.getFocusedGroupId()

				if (hitShape) {
					if (this.editor.isShapeOfType<TLGroupShape>(hitShape, 'group')) {
						// Probably select the shape
						selectOnCanvasPointerUp(this.editor, info)
						return
					} else {
						const parent = this.editor.getShape(hitShape.parentId)
						if (parent && this.editor.isShapeOfType<TLGroupShape>(parent, 'group')) {
							// The shape is the direct child of a group. If the group is
							// selected, then we can select the shape. If the group is the
							// focus layer id, then we can double click into it as usual.
							if (focusedGroupId && parent.id === focusedGroupId) {
								// noop, double click on the shape as normal below
							} else {
								// The shape is the child of some group other than our current
								// focus layer. We should probably select the group instead.
								selectOnCanvasPointerUp(this.editor, info)
								return
							}
						}
					}

					// double click on the shape. We'll start editing the
					// shape if it's editable or else do a double click on
					// the canvas.
					this.onDoubleClick({
						...info,
						shape: hitShape,
						target: 'shape',
					})

					return
				}

				if (!this.editor.inputs.shiftKey) {
					this.handleDoubleClickOnCanvas(info)
				}
				break
			}
			case 'selection': {
				if (this.editor.getIsReadonly()) break

				const onlySelectedShape = this.editor.getOnlySelectedShape()

				if (onlySelectedShape) {
					const util = this.editor.getShapeUtil(onlySelectedShape)

					if (!this.canInteractWithShapeInReadOnly(onlySelectedShape)) {
						return
					}

					// Test edges for an onDoubleClickEdge handler
					if (
						info.handle === 'right' ||
						info.handle === 'left' ||
						info.handle === 'top' ||
						info.handle === 'bottom'
					) {
						const change = util.onDoubleClickEdge?.(onlySelectedShape, info)
						if (change) {
							this.editor.markHistoryStoppingPoint('double click edge')
							this.editor.updateShapes([change])
							kickoutOccludedShapes(this.editor, [onlySelectedShape.id])
							return
						}
					}

					if (
						info.handle === 'top_left' ||
						info.handle === 'top_right' ||
						info.handle === 'bottom_right' ||
						info.handle === 'bottom_left'
					) {
						const change = util.onDoubleClickCorner?.(onlySelectedShape, info)
						if (change) {
							this.editor.markHistoryStoppingPoint('double click corner')
							this.editor.updateShapes([change])
							kickoutOccludedShapes(this.editor, [onlySelectedShape.id])
							return
						}
					}
					// For corners OR edges but NOT rotation corners
					if (
						util.canCrop(onlySelectedShape) &&
						!this.editor.isShapeOrAncestorLocked(onlySelectedShape)
					) {
						this.parent.transition('crop', info)
						return
					}

					if (this.shouldStartEditingShape(onlySelectedShape)) {
						this.startEditingShape(onlySelectedShape, info, true /* select all */)
					}
				}
				break
			}
			case 'shape': {
				const { shape } = info
				const util = this.editor.getShapeUtil(shape)

				// Allow playing videos and embeds
				if (shape.type !== 'video' && shape.type !== 'embed' && this.editor.getIsReadonly()) break

				if (util.onDoubleClick) {
					// Call the shape's double click handler
					const change = util.onDoubleClick?.(shape)
					if (change) {
						this.editor.updateShapes([change])
						return
					}
				}

				if (util.canCrop(shape) && !this.editor.isShapeOrAncestorLocked(shape)) {
					// crop image etc on double click
					this.editor.markHistoryStoppingPoint('select and crop')
					this.editor.select(info.shape?.id)
					this.parent.transition('crop', info)
					return
				}

				// If the shape can edit, then begin editing
				if (this.shouldStartEditingShape(shape)) {
					this.startEditingShape(shape, info, true /* select all */)
				} else {
					// If the shape's double click handler has not created a change,
					// and if the shape cannot edit, then create a text shape and
					// begin editing the text shape
					this.handleDoubleClickOnCanvas(info)
				}
				break
			}
			case 'handle': {
				if (this.editor.getIsReadonly()) break
				const { shape, handle } = info

				const util = this.editor.getShapeUtil(shape)
				const changes = util.onDoubleClickHandle?.(shape, handle)

				if (changes) {
					this.editor.updateShapes([changes])
				} else {
					// If the shape's double click handler has not created a change,
					// and if the shape can edit, then begin editing the shape.
					if (this.shouldStartEditingShape(shape)) {
						this.startEditingShape(shape, info, true /* select all */)
					}
				}
			}
		}
	}

	override onRightClick(info: TLPointerEventInfo) {
		switch (info.target) {
			case 'canvas': {
				const hoveredShape = this.editor.getHoveredShape()
				const hitShape =
					hoveredShape && !this.editor.isShapeOfType<TLGroupShape>(hoveredShape, 'group')
						? hoveredShape
						: this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
								margin: this.editor.options.hitTestMargin / this.editor.getZoomLevel(),
								hitInside: false,
								hitLabels: true,
								hitLocked: true,
								hitFrameInside: true,
								renderingOnly: true,
							})

				if (hitShape) {
					this.onRightClick({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}

				const selectedShapeIds = this.editor.getSelectedShapeIds()
				const onlySelectedShape = this.editor.getOnlySelectedShape()
				const {
					inputs: { currentPagePoint },
				} = this.editor

				if (
					selectedShapeIds.length > 1 ||
					(onlySelectedShape &&
						!this.editor.getShapeUtil(onlySelectedShape).hideSelectionBoundsBg(onlySelectedShape))
				) {
					if (isPointInRotatedSelectionBounds(this.editor, currentPagePoint)) {
						this.onRightClick({
							...info,
							target: 'selection',
						})
						return
					}
				}

				this.editor.selectNone()
				break
			}
			case 'shape': {
				const { selectedShapeIds } = this.editor.getCurrentPageState()
				const { shape } = info

				const targetShape = this.editor.getOutermostSelectableShape(
					shape,
					(parent) => !selectedShapeIds.includes(parent.id)
				)

				if (
					!selectedShapeIds.includes(targetShape.id) &&
					!this.editor.findShapeAncestor(targetShape, (shape) =>
						selectedShapeIds.includes(shape.id)
					)
				) {
					this.editor.markHistoryStoppingPoint('selecting shape')
					this.editor.setSelectedShapes([targetShape.id])
				}
				break
			}
		}
	}

	override onCancel() {
		if (
			this.editor.getFocusedGroupId() !== this.editor.getCurrentPageId() &&
			this.editor.getSelectedShapeIds().length > 0
		) {
			this.editor.popFocusedGroupId()
		} else {
			this.editor.markHistoryStoppingPoint('clearing selection')
			this.editor.selectNone()
		}
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
		this.selectedShapesOnKeyDown = this.editor.getSelectedShapes()

		switch (info.code) {
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				if (info.accelKey) {
					if (info.shiftKey) {
						if (info.code === 'ArrowDown') {
							this.editor.selectFirstChildShape()
						} else if (info.code === 'ArrowUp') {
							this.editor.selectParentShape()
						}
					} else {
						this.editor.selectAdjacentShape(
							info.code.replace('Arrow', '').toLowerCase() as TLAdjacentDirection
						)
					}
					return
				}
				this.nudgeSelectedShapes(false)
				return
			}
		}

		if (debugFlags['editOnType'].get()) {
			// This feature flag lets us start editing a note shape's label when a key is pressed.
			// We exclude certain keys to avoid conflicting with modifiers, but there are conflicts
			// with other action kbds, hence why this is kept behind a feature flag.
			if (!SKIPPED_KEYS_FOR_AUTO_EDITING.includes(info.key) && !info.altKey && !info.ctrlKey) {
				// If the only selected shape is editable, then begin editing it
				const onlySelectedShape = this.editor.getOnlySelectedShape()
				if (
					onlySelectedShape &&
					// If it's a note shape, then edit on type
					this.editor.isShapeOfType(onlySelectedShape, 'note') &&
					// If it's not locked or anything
					this.shouldStartEditingShape(onlySelectedShape)
				) {
					this.startEditingShape(
						onlySelectedShape,
						{
							...info,
							target: 'shape',
							shape: onlySelectedShape,
						},
						true /* select all */
					)
					return
				}
			}
		}
	}

	override onKeyRepeat(info: TLKeyboardEventInfo) {
		switch (info.code) {
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				if (info.accelKey) {
					this.editor.selectAdjacentShape(
						info.code.replace('Arrow', '').toLowerCase() as TLAdjacentDirection
					)
					return
				}
				this.nudgeSelectedShapes(true)
				break
			}
			case 'Tab': {
				const selectedShapes = this.editor.getSelectedShapes()
				if (selectedShapes.length) {
					this.editor.selectAdjacentShape(info.shiftKey ? 'prev' : 'next')
				}
				break
			}
		}
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		switch (info.key) {
			case 'Enter': {
				// Because Enter onKeyDown can happen outside the canvas (but then focus the canvas potentially),
				// we need to check if the canvas was initially selecting something before continuing.
				if (!this.selectedShapesOnKeyDown.length) return

				const selectedShapes = this.editor.getSelectedShapes()

				// On enter, if every selected shape is a group, then select all of the children of the groups
				if (
					selectedShapes.every((shape) => this.editor.isShapeOfType<TLGroupShape>(shape, 'group'))
				) {
					this.editor.setSelectedShapes(
						selectedShapes.flatMap((shape) => this.editor.getSortedChildIdsForParent(shape.id))
					)
					return
				}

				// If the only selected shape is editable, then begin editing it
				const onlySelectedShape = this.editor.getOnlySelectedShape()
				if (onlySelectedShape && this.shouldStartEditingShape(onlySelectedShape)) {
					this.startEditingShape(
						onlySelectedShape,
						{
							...info,
							target: 'shape',
							shape: onlySelectedShape,
						},
						true /* select all */
					)
					return
				}

				// If the only selected shape is croppable, then begin cropping it
				if (getShouldEnterCropMode(this.editor)) {
					this.parent.transition('crop', info)
				}
				break
			}
			case 'Tab': {
				const selectedShapes = this.editor.getSelectedShapes()
				if (selectedShapes.length) {
					this.editor.selectAdjacentShape(info.shiftKey ? 'prev' : 'next')
				}
				break
			}
		}
	}

	private shouldStartEditingShape(
		shape: TLShape | null = this.editor.getOnlySelectedShape()
	): boolean {
		if (!shape) return false
		if (this.editor.isShapeOrAncestorLocked(shape) && shape.type !== 'embed') return false
		if (!this.canInteractWithShapeInReadOnly(shape)) return false
		return this.editor.getShapeUtil(shape).canEdit(shape)
	}

	private startEditingShape(
		shape: TLShape,
		info: TLClickEventInfo | TLKeyboardEventInfo,
		shouldSelectAll?: boolean
	) {
		if (this.editor.isShapeOrAncestorLocked(shape) && shape.type !== 'embed') return
		this.editor.markHistoryStoppingPoint('editing shape')
		startEditingShapeWithLabel(this.editor, shape, shouldSelectAll)
		this.parent.transition('editing_shape', info)
	}

	isOverArrowLabelTest(shape: TLShape | undefined) {
		if (!shape) return false

		return isOverArrowLabel(this.editor, shape)
	}

	handleDoubleClickOnCanvas(info: TLClickEventInfo) {
		// Create text shape and transition to editing_shape
		if (this.editor.getIsReadonly()) return

		if (!this.editor.options.createTextOnCanvasDoubleClick) return

		this.editor.markHistoryStoppingPoint('creating text shape')

		const id = createShapeId()

		const { x, y } = this.editor.inputs.currentPagePoint

		// Allow this to trigger the max shapes reached alert
		this.editor.createShapes<TLTextShape>([
			{
				id,
				type: 'text',
				x,
				y,
				props: {
					richText: toRichText(''),
					autoSize: true,
				},
			},
		])

		const shape = this.editor.getShape(id)
		if (!shape) return

		const util = this.editor.getShapeUtil(shape)
		if (this.editor.getIsReadonly()) {
			if (!util.canEditInReadonly(shape)) {
				return
			}
		}

		this.editor.setEditingShape(id)
		this.editor.select(id)
		this.parent.transition('editing_shape', info)
	}

	private nudgeSelectedShapes(ephemeral = false) {
		const {
			editor: {
				inputs: { keys },
			},
		} = this

		// We want to use the "actual" shift key state,
		// not the one that's in the editor.inputs.shiftKey,
		// because that one uses a short timeout on release
		const shiftKey = keys.has('ShiftLeft')

		const delta = new Vec(0, 0)

		if (keys.has('ArrowLeft')) delta.x -= 1
		if (keys.has('ArrowRight')) delta.x += 1
		if (keys.has('ArrowUp')) delta.y -= 1
		if (keys.has('ArrowDown')) delta.y += 1

		if (delta.equals(new Vec(0, 0))) return

		if (!ephemeral) this.editor.markHistoryStoppingPoint('nudge shapes')

		const { gridSize } = this.editor.getDocumentSettings()

		const step = this.editor.getInstanceState().isGridMode
			? shiftKey
				? gridSize * GRID_INCREMENT
				: gridSize
			: shiftKey
				? MAJOR_NUDGE_FACTOR
				: MINOR_NUDGE_FACTOR

		const selectedShapeIds = this.editor.getSelectedShapeIds()
		this.editor.nudgeShapes(selectedShapeIds, delta.mul(step))
		kickoutOccludedShapes(this.editor, selectedShapeIds)
	}

	private canInteractWithShapeInReadOnly(shape: TLShape) {
		if (!this.editor.getIsReadonly()) return true
		const util = this.editor.getShapeUtil(shape)
		if (util.canEditInReadonly(shape)) return true
		return false
	}
}

export const MAJOR_NUDGE_FACTOR = 10
export const MINOR_NUDGE_FACTOR = 1
export const GRID_INCREMENT = 5

function isPointInRotatedSelectionBounds(editor: Editor, point: VecLike) {
	const selectionBounds = editor.getSelectionRotatedPageBounds()
	if (!selectionBounds) return false

	const selectionRotation = editor.getSelectionRotation()
	if (!selectionRotation) return selectionBounds.containsPoint(point)

	return pointInPolygon(
		point,
		selectionBounds.corners.map((c) => Vec.RotWith(c, selectionBounds.point, selectionRotation))
	)
}
