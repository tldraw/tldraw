import { Vec2d } from '@tldraw/primitives'
import { createShapeId, TLShape } from '@tldraw/tlschema'
import {
	TLClickEventInfo,
	TLEventHandlers,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
} from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	onPointerEnter: TLEventHandlers['onPointerEnter'] = (info) => {
		switch (info.target) {
			case 'canvas': {
				// noop
				break
			}
			case 'shape': {
				const { selectedIds, focusLayerId } = this.app
				const hoveringShape = this.app.getOutermostSelectableShape(
					info.shape,
					(parent) => !selectedIds.includes(parent.id)
				)
				if (hoveringShape.id !== focusLayerId) {
					this.app.setHoveredId(hoveringShape.id)
				}
				break
			}
		}
	}

	onPointerLeave: TLEventHandlers['onPointerEnter'] = (info) => {
		switch (info.target) {
			case 'shape': {
				this.app.setHoveredId(null)
				break
			}
		}
	}

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		if (this.app.isMenuOpen) return

		const shouldEnterCropMode = this.shouldEnterCropMode(info)

		if (info.ctrlKey && !shouldEnterCropMode) {
			this.parent.transition('brushing', info)
			return
		}

		switch (info.target) {
			case 'canvas': {
				this.parent.transition('pointing_canvas', info)
				break
			}
			case 'shape': {
				this.parent.transition('pointing_shape', info)
				break
			}
			case 'handle': {
				if (this.app.isReadOnly) break
				if (this.app.inputs.altKey) {
					this.parent.transition('pointing_shape', info)
				} else {
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
						this.parent.transition('pointing_rotate_handle', info)
						break
					}
					case 'top':
					case 'right':
					case 'bottom':
					case 'left': {
						if (shouldEnterCropMode) {
							this.parent.transition('pointing_crop_handle', info)
						} else {
							this.parent.transition('pointing_resize_handle', info)
						}
						break
					}
					case 'top_left':
					case 'top_right':
					case 'bottom_left':
					case 'bottom_right': {
						if (shouldEnterCropMode) {
							this.parent.transition('pointing_crop_handle', info)
						} else {
							this.parent.transition('pointing_resize_handle', info)
						}
						break
					}
					default: {
						this.parent.transition('pointing_selection', info)
					}
				}
				break
			}
		}
	}

	onDoubleClick: TLEventHandlers['onDoubleClick'] = (info) => {
		if (info.phase !== 'up') return

		switch (info.target) {
			case 'canvas': {
				// Create text shape and transition to editing_shape
				if (this.app.isReadOnly) break
				this.createTextShapeAtPoint(info)
				break
			}
			case 'selection': {
				if (this.app.isReadOnly) break

				const { onlySelectedShape } = this.app
				if (onlySelectedShape) {
					const util = this.app.getShapeUtil(onlySelectedShape)

					// Test edges for an onDoubleClickEdge handler
					if (
						info.handle === 'right' ||
						info.handle === 'left' ||
						info.handle === 'top' ||
						info.handle === 'bottom'
					) {
						const change = util.onDoubleClickEdge?.(onlySelectedShape)
						if (change) {
							this.app.mark('double click edge')
							this.app.updateShapes([change])
							return
						}
					}

					// For corners OR edges
					if (util.canCrop(onlySelectedShape)) {
						this.parent.transition('crop', info)
						return
					}

					if (util.canEdit(onlySelectedShape)) {
						this.startEditingShape(onlySelectedShape, info)
					}
				}
				break
			}
			case 'shape': {
				const { shape } = info
				const util = this.app.getShapeUtil(shape)

				// Allow video playing
				if (shape.type !== 'video' && this.app.isReadOnly) break

				if (util.onDoubleClick) {
					// Call the shape's double click handler
					const change = util.onDoubleClick?.(shape)
					if (change) {
						this.app.updateShapes([change])
						return
					} else if (util.canCrop(shape)) {
						// crop on double click
						this.app.mark('select and crop')
						this.app.select(info.shape?.id)
						this.parent.transition('crop', info)
						return
					}
				}
				// If the shape can edit, then begin editing
				if (util.canEdit(shape)) {
					this.startEditingShape(shape, info)
				} else {
					// If the shape's double click handler has not created a change,
					// and if the shape cannot edit, then create a text shape and
					// begin editing the text shape
					this.createTextShapeAtPoint(info)
				}
				break
			}
			case 'handle': {
				if (this.app.isReadOnly) break
				const { shape, handle } = info

				const util = this.app.getShapeUtil(shape)
				const changes = util.onDoubleClickHandle?.(shape, handle)

				if (changes) {
					this.app.updateShapes([changes])
				} else {
					// If the shape's double click handler has not created a change,
					// and if the shape can edit, then begin editing the shape.
					if (util.canEdit(shape)) {
						this.startEditingShape(shape, info)
					}
				}
			}
		}
	}

	onRightClick: TLEventHandlers['onRightClick'] = (info) => {
		switch (info.target) {
			case 'canvas': {
				this.app.selectNone()
				break
			}
			case 'shape': {
				const { selectedIds } = this.app.pageState
				const { shape } = info

				const targetShape = this.app.getOutermostSelectableShape(
					shape,
					(parent) => !this.app.isSelected(parent.id)
				)

				if (!selectedIds.includes(targetShape.id)) {
					this.app.mark('selecting shape')
					this.app.setSelectedIds([targetShape.id])
				}
				break
			}
		}
	}

	onEnter = () => {
		this.app.setHoveredId(null)
		this.app.setCursor({ type: 'default' })
	}

	onCancel: TLEventHandlers['onCancel'] = () => {
		if (this.app.focusLayerId !== this.app.currentPageId && this.app.selectedIds.length > 0) {
			this.app.popFocusLayer()
		} else {
			this.app.mark('clearing selection')
			this.app.selectNone()
		}
	}

	onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		switch (info.code) {
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				this.nudgeSelectedShapes(false)
				break
			}
		}
	}

	onKeyRepeat: TLEventHandlers['onKeyDown'] = (info) => {
		switch (info.code) {
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				this.nudgeSelectedShapes(true)
				break
			}
		}
	}

	onKeyUp = (info: TLKeyboardEventInfo) => {
		if (this.app.isReadOnly) return
		switch (info.code) {
			case 'Enter': {
				const { selectedShapes } = this.app

				if (selectedShapes.every((shape) => shape.type === 'group')) {
					this.app.setSelectedIds(
						selectedShapes.flatMap((shape) => this.app.getSortedChildIds(shape.id))
					)
					return
				}

				const { onlySelectedShape } = this.app
				const util = onlySelectedShape && this.app.getShapeUtil(onlySelectedShape)
				if (util && util.canEdit(onlySelectedShape)) {
					this.startEditingShape(onlySelectedShape, {
						...info,
						target: 'shape',
						shape: onlySelectedShape,
					})
					return
				}

				if (util && util.canCrop(onlySelectedShape)) {
					this.parent.transition('crop', info)
				}
				break
			}
		}
	}

	private shouldEnterCropMode(info: TLPointerEventInfo): boolean {
		const singleShape = this.app.onlySelectedShape
		if (!singleShape) return false

		const shapeUtil = this.app.getShapeUtil(singleShape)
		return shapeUtil.canCrop(singleShape) && info.ctrlKey
	}

	private startEditingShape(shape: TLShape, info: TLClickEventInfo | TLKeyboardEventInfo) {
		this.app.mark('editing shape')
		this.app.setEditingId(shape.id)
		this.parent.transition('editing_shape', info)
	}

	private createTextShapeAtPoint(info: TLClickEventInfo) {
		this.app.mark('creating text shape')

		const id = createShapeId()

		const { x, y } = this.app.inputs.currentPagePoint

		this.app.createShapes([
			{
				id,
				type: 'text',
				x,
				y,
				props: {
					text: '',
					autoSize: true,
				},
			},
		])

		const shape = this.app.getShapeById(id)
		if (!shape) return

		const bounds = this.app.getBounds(shape)

		this.app.updateShapes([
			{
				id,
				type: 'text',
				x: shape.x - bounds.width / 2,
				y: shape.y - bounds.height / 2,
			},
		])

		this.app.setEditingId(id)
		this.app.select(id)
		this.parent.transition('editing_shape', info)
	}

	private nudgeSelectedShapes(ephemeral = false) {
		const {
			app: {
				inputs: { keys },
			},
		} = this

		// We want to use the "actual" shift key state,
		// not the one that's in the app.inputs.shiftKey,
		// because that one uses a short timeout on release
		const shiftKey = keys.has('Shift')

		const delta = new Vec2d(0, 0)

		if (keys.has('ArrowLeft')) delta.x -= 1
		if (keys.has('ArrowRight')) delta.x += 1
		if (keys.has('ArrowUp')) delta.y -= 1
		if (keys.has('ArrowDown')) delta.y += 1

		if (delta.equals(new Vec2d(0, 0))) return

		if (!ephemeral) this.app.mark('nudge shapes')

		this.app.nudgeShapes(this.app.selectedIds, delta, shiftKey)
	}
}
