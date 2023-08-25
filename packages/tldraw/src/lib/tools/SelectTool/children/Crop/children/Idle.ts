import { StateNode, TLEventHandlers, TLExitEventHandler, TLGroupShape, Vec2d } from '@tldraw/editor'
import { getHitShapeOnCanvasPointerDown } from '../../../../selection-logic/getHitShapeOnCanvasPointerDown'
import { ShapeWithCrop, getTranslateCroppedImageChange } from './crop_helpers'

export class Idle extends StateNode {
	static override id = 'idle'

	override onEnter = () => {
		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)

		const { onlySelectedShape } = this.editor

		// well this fucking sucks. what the fuck.
		// it's possible for a user to enter cropping, then undo
		// (which clears the cropping id) but still remain in this state.
		this.editor.on('change-history', this.cleanupCroppingState)

		if (onlySelectedShape) {
			this.editor.mark('crop')
			this.editor.setCroppingShape(onlySelectedShape.id)
		}
	}

	override onExit: TLExitEventHandler = () => {
		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)

		this.editor.off('change-history', this.cleanupCroppingState)
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.editor.setCroppingShape(null)
		this.editor.setCurrentTool('select.idle', {})
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		if (this.editor.isMenuOpen) return

		if (info.ctrlKey) {
			this.cancel()
			// feed the event back into the statechart
			this.editor.root.handleEvent(info)
			return
		}

		switch (info.target) {
			case 'canvas': {
				const hitShape = getHitShapeOnCanvasPointerDown(this.editor)
				if (hitShape && !this.editor.isShapeOfType<TLGroupShape>(hitShape, 'group')) {
					this.onPointerDown({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}

				this.cancel()
				// feed the event back into the statechart
				this.editor.root.handleEvent(info)
				break
			}
			case 'shape': {
				if (info.shape.id === this.editor.croppingShapeId) {
					this.editor.setCurrentTool('select.crop.pointing_crop', info)
					return
				} else {
					if (this.editor.getShapeUtil(info.shape)?.canCrop(info.shape)) {
						this.editor.setCroppingShape(info.shape.id)
						this.editor.setSelectedShapes([info.shape.id])
						this.editor.setCurrentTool('select.crop.pointing_crop', info)
					} else {
						this.cancel()
						// feed the event back into the statechart
						this.editor.root.handleEvent(info)
					}
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
						this.editor.setCurrentTool('select.pointing_rotate_handle', {
							...info,
							onInteractionEnd: 'select.crop',
						})
						break
					}
					case 'top':
					case 'right':
					case 'bottom':
					case 'left': {
						this.editor.setCurrentTool('select.pointing_crop_handle', {
							...info,
							onInteractionEnd: 'select.crop',
						})
						break
					}
					case 'top_left':
					case 'top_right':
					case 'bottom_left':
					case 'bottom_right': {
						this.editor.setCurrentTool('select.pointing_crop_handle', {
							...info,
							onInteractionEnd: 'select.crop',
						})
						break
					}
					default: {
						this.cancel()
					}
				}
				break
			}
		}
	}

	override onDoubleClick: TLEventHandlers['onDoubleClick'] = (info) => {
		// Without this, the double click's "settle" would trigger the reset
		// after the user double clicked the edge to begin cropping
		if (this.editor.inputs.shiftKey || info.phase !== 'up') return

		if (!this.editor.croppingShapeId) return
		const shape = this.editor.getShape(this.editor.croppingShapeId)
		if (!shape) return

		const util = this.editor.getShapeUtil(shape)
		if (!util) return

		if (info.target === 'selection') {
			util.onDoubleClickEdge?.(shape)
		}
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = () => {
		this.nudgeCroppingImage(false)
	}

	override onKeyRepeat: TLEventHandlers['onKeyRepeat'] = () => {
		this.nudgeCroppingImage(true)
	}

	override onKeyUp: TLEventHandlers['onKeyUp'] = (info) => {
		switch (info.code) {
			case 'Enter': {
				this.editor.setCroppingShape(null)
				this.editor.setCurrentTool('select.idle', {})
				break
			}
		}
	}

	private cancel() {
		this.editor.setCroppingShape(null)
		this.editor.setCurrentTool('select.idle', {})
	}

	private cleanupCroppingState = () => {
		if (!this.editor.croppingShapeId) {
			this.editor.setCurrentTool('select.idle', {})
		}
	}

	private nudgeCroppingImage(ephemeral = false) {
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

		if (keys.has('ArrowLeft')) delta.x += 1
		if (keys.has('ArrowRight')) delta.x -= 1
		if (keys.has('ArrowUp')) delta.y += 1
		if (keys.has('ArrowDown')) delta.y -= 1

		if (delta.equals(new Vec2d(0, 0))) return

		if (shiftKey) delta.mul(10)

		const shape = this.editor.getShape(this.editor.croppingShapeId!) as ShapeWithCrop
		if (!shape) return
		const partial = getTranslateCroppedImageChange(this.editor, shape, delta)

		if (partial) {
			if (!ephemeral) {
				// We don't want to create new marks if the user
				// is just holding down the arrow keys
				this.editor.mark('translate crop')
			}

			this.editor.updateShapes<ShapeWithCrop>([partial])
		}
	}
}
