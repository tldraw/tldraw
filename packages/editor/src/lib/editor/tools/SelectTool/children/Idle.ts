import { Vec2d } from '@tldraw/primitives'
import { TLGeoShape, TLShape, TLTextShape, createShapeId } from '@tldraw/tlschema'
import { debugFlags } from '../../../../utils/debug-flags'
import { GroupShapeUtil } from '../../../shapes/group/GroupShapeUtil'
import {
	TLClickEventInfo,
	TLEventHandlers,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
} from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	isDarwin = window.navigator.userAgent.toLowerCase().indexOf('mac') > -1

	onPointerEnter: TLEventHandlers['onPointerEnter'] = (info) => {
		switch (info.target) {
			case 'canvas': {
				// noop
				break
			}
			case 'shape': {
				const { selectedIds, focusLayerId } = this.editor
				const hoveringShape = this.editor.getOutermostSelectableShape(
					info.shape,
					(parent) => !selectedIds.includes(parent.id)
				)
				if (hoveringShape.id !== focusLayerId) {
					this.editor.setHoveredId(hoveringShape.id)
				}

				// Custom cursor debugging!
				// Change the cursor to the type specified by the shape's text label
				if (debugFlags.debugCursors.value) {
					if (hoveringShape.type !== 'geo') break
					const cursorType = (hoveringShape as TLGeoShape).props.text
					try {
						this.editor.setCursor({ type: cursorType })
					} catch (e) {
						console.error(`Cursor type not recognized: '${cursorType}'`)
						this.editor.setCursor({ type: 'default' })
					}
				}

				break
			}
		}
	}

	onPointerLeave: TLEventHandlers['onPointerLeave'] = (info) => {
		switch (info.target) {
			case 'shape': {
				this.editor.setHoveredId(null)
				break
			}
		}
	}

	onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		if (this.editor.isMenuOpen) return

		const shouldEnterCropMode = this.shouldEnterCropMode(info, true)

		if (info.ctrlKey && !shouldEnterCropMode) {
			// On Mac, you can right click using the Control keys + Click.
			if (info.target === 'shape' && this.isDarwin && this.editor.inputs.keys.has('ControlLeft')) {
				if (!this.editor.isShapeOrAncestorLocked(info.shape)) {
					this.parent.transition('pointing_shape', info)
					return
				}
			}
			this.parent.transition('brushing', info)
			return
		}

		switch (info.target) {
			case 'canvas': {
				this.parent.transition('pointing_canvas', info)
				break
			}
			case 'shape': {
				if (this.editor.isShapeOrAncestorLocked(info.shape)) break
				this.parent.transition('pointing_shape', info)
				break
			}
			case 'handle': {
				if (this.editor.isReadOnly) break
				if (this.editor.inputs.altKey) {
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
				if (this.editor.isReadOnly) break
				this.handleDoubleClickOnCanvas(info)
				break
			}
			case 'selection': {
				if (this.editor.isReadOnly) break

				const { onlySelectedShape } = this.editor
				if (onlySelectedShape) {
					const util = this.editor.getShapeUtil(onlySelectedShape)

					// Test edges for an onDoubleClickEdge handler
					if (
						info.handle === 'right' ||
						info.handle === 'left' ||
						info.handle === 'top' ||
						info.handle === 'bottom'
					) {
						const change = util.onDoubleClickEdge?.(onlySelectedShape)
						if (change) {
							this.editor.mark('double click edge')
							this.editor.updateShapes([change])
							return
						}
					}

					// For corners OR edges
					if (
						util.canCrop(onlySelectedShape) &&
						!this.editor.isShapeOrAncestorLocked(onlySelectedShape)
					) {
						this.parent.transition('crop', info)
						return
					}

					if (this.shouldStartEditingShape(onlySelectedShape)) {
						this.startEditingShape(onlySelectedShape, info)
					}
				}
				break
			}
			case 'shape': {
				const { shape } = info
				const util = this.editor.getShapeUtil(shape)

				// Allow playing videos and embeds
				if (shape.type !== 'video' && shape.type !== 'embed' && this.editor.isReadOnly) break

				if (util.onDoubleClick) {
					// Call the shape's double click handler
					const change = util.onDoubleClick?.(shape)
					if (change) {
						this.editor.updateShapes([change])
						return
					} else if (util.canCrop(shape) && !this.editor.isShapeOrAncestorLocked(shape)) {
						// crop on double click
						this.editor.mark('select and crop')
						this.editor.select(info.shape?.id)
						this.parent.transition('crop', info)
						return
					}
				}
				// If the shape can edit, then begin editing
				if (this.shouldStartEditingShape(shape)) {
					this.startEditingShape(shape, info)
				} else {
					// If the shape's double click handler has not created a change,
					// and if the shape cannot edit, then create a text shape and
					// begin editing the text shape
					this.handleDoubleClickOnCanvas(info)
				}
				break
			}
			case 'handle': {
				if (this.editor.isReadOnly) break
				const { shape, handle } = info

				const util = this.editor.getShapeUtil(shape)
				const changes = util.onDoubleClickHandle?.(shape, handle)

				if (changes) {
					this.editor.updateShapes([changes])
				} else {
					// If the shape's double click handler has not created a change,
					// and if the shape can edit, then begin editing the shape.
					if (this.shouldStartEditingShape(shape)) {
						this.startEditingShape(shape, info)
					}
				}
			}
		}
	}

	onRightClick: TLEventHandlers['onRightClick'] = (info) => {
		switch (info.target) {
			case 'canvas': {
				this.editor.selectNone()
				break
			}
			case 'shape': {
				const { selectedIds } = this.editor.pageState
				const { shape } = info

				const targetShape = this.editor.getOutermostSelectableShape(
					shape,
					(parent) => !this.editor.isSelected(parent.id)
				)

				if (!selectedIds.includes(targetShape.id)) {
					this.editor.mark('selecting shape')
					this.editor.setSelectedIds([targetShape.id])
				}
				break
			}
		}
	}

	onEnter = () => {
		this.editor.setHoveredId(null)
		this.editor.setCursor({ type: 'default' })
	}

	onCancel: TLEventHandlers['onCancel'] = () => {
		if (
			this.editor.focusLayerId !== this.editor.currentPageId &&
			this.editor.selectedIds.length > 0
		) {
			this.editor.popFocusLayer()
		} else {
			this.editor.mark('clearing selection')
			this.editor.selectNone()
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
		if (this.editor.isReadOnly) {
			switch (info.code) {
				case 'Enter': {
					if (this.shouldStartEditingShape() && this.editor.onlySelectedShape) {
						this.startEditingShape(this.editor.onlySelectedShape, {
							...info,
							target: 'shape',
							shape: this.editor.onlySelectedShape,
						})
						return
					}
					break
				}
			}
		} else {
			switch (info.code) {
				case 'Enter': {
					const { selectedShapes } = this.editor

					if (selectedShapes.every((shape) => this.editor.isShapeOfType(shape, GroupShapeUtil))) {
						this.editor.setSelectedIds(
							selectedShapes.flatMap((shape) => this.editor.getSortedChildIds(shape.id))
						)
						return
					}

					if (this.shouldStartEditingShape() && this.editor.onlySelectedShape) {
						this.startEditingShape(this.editor.onlySelectedShape, {
							...info,
							target: 'shape',
							shape: this.editor.onlySelectedShape,
						})
						return
					}

					if (this.shouldEnterCropMode(info, false)) {
						this.parent.transition('crop', info)
					}
					break
				}
			}
		}
	}

	private shouldStartEditingShape(shape: TLShape | null = this.editor.onlySelectedShape): boolean {
		if (!shape) return false
		if (this.editor.isShapeOrAncestorLocked(shape) && shape.type !== 'embed') return false

		const util = this.editor.getShapeUtil(shape)
		return util.canEdit(shape)
	}

	private shouldEnterCropMode(
		info: TLPointerEventInfo | TLKeyboardEventInfo,
		withCtrlKey: boolean
	): boolean {
		const singleShape = this.editor.onlySelectedShape
		if (!singleShape) return false
		if (this.editor.isShapeOrAncestorLocked(singleShape)) return false

		const shapeUtil = this.editor.getShapeUtil(singleShape)
		// Should the Ctrl key be pressed to enter crop mode
		if (withCtrlKey) {
			return shapeUtil.canCrop(singleShape) && info.ctrlKey
		} else {
			return shapeUtil.canCrop(singleShape)
		}
	}

	private startEditingShape(shape: TLShape, info: TLClickEventInfo | TLKeyboardEventInfo) {
		if (this.editor.isShapeOrAncestorLocked(shape) && shape.type !== 'embed') return
		this.editor.mark('editing shape')
		this.editor.setEditingId(shape.id)
		this.parent.transition('editing_shape', info)
	}

	handleDoubleClickOnCanvas(info: TLClickEventInfo) {
		this.editor.mark('creating text shape')

		const id = createShapeId()

		const { x, y } = this.editor.inputs.currentPagePoint

		this.editor.createShapes<TLTextShape>([
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

		const shape = this.editor.getShapeById(id)
		if (!shape) return

		const bounds = this.editor.getBounds(shape)

		this.editor.updateShapes([
			{
				id,
				type: 'text',
				x: shape.x - bounds.width / 2,
				y: shape.y - bounds.height / 2,
			},
		])

		this.editor.setEditingId(id)
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

		const delta = new Vec2d(0, 0)

		if (keys.has('ArrowLeft')) delta.x -= 1
		if (keys.has('ArrowRight')) delta.x += 1
		if (keys.has('ArrowUp')) delta.y -= 1
		if (keys.has('ArrowDown')) delta.y += 1

		if (delta.equals(new Vec2d(0, 0))) return

		if (!ephemeral) this.editor.mark('nudge shapes')

		this.editor.nudgeShapes(this.editor.selectedIds, delta, shiftKey)
	}
}
