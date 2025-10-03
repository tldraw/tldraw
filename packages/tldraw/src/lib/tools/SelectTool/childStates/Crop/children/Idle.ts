import {
	ShapeWithCrop,
	StateNode,
	TLClickEventInfo,
	TLGroupShape,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
	Vec,
} from '@tldraw/editor'
import { getHitShapeOnCanvasPointerDown } from '../../../../selection-logic/getHitShapeOnCanvasPointerDown'
import { getTranslateCroppedImageChange } from './crop_helpers'

export class Idle extends StateNode {
	static override id = 'idle'

	override onEnter() {
		this.editor.setCursor({ type: 'default', rotation: 0 })

		const onlySelectedShape = this.editor.getOnlySelectedShape()

		if (onlySelectedShape) {
			this.editor.setCroppingShape(onlySelectedShape.id)
		}
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onCancel() {
		this.editor.setCroppingShape(null)
		this.editor.setCurrentTool('select.idle', {})
	}

	override onPointerDown(info: TLPointerEventInfo) {
		if (info.accelKey) {
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
				if (info.shape.id === this.editor.getCroppingShapeId()) {
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
							onInteractionEnd: 'select.crop.idle',
						})
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
						this.editor.setCurrentTool('select.crop.pointing_crop_handle', {
							...info,
							onInteractionEnd: 'select.crop.idle',
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

	override onDoubleClick(info: TLClickEventInfo) {
		// Without this, the double click's "settle" would trigger the reset
		// after the user double clicked the edge to begin cropping
		if (this.editor.inputs.shiftKey || info.phase !== 'up') return

		const croppingShapeId = this.editor.getCroppingShapeId()
		if (!croppingShapeId) return
		const shape = this.editor.getShape(croppingShapeId)
		if (!shape) return

		const util = this.editor.getShapeUtil(shape)
		if (!util) return

		if (info.target === 'selection') {
			util.onDoubleClickEdge?.(shape, info)
			return
		}

		// If the user double clicks the canvas, we want to cancel cropping,
		// especially if it's an animated image, we want the image to continue playing.
		this.cancel()
		this.editor.root.handleEvent(info)
	}

	override onKeyDown() {
		this.nudgeCroppingImage(false)
	}

	override onKeyRepeat() {
		this.nudgeCroppingImage(true)
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		switch (info.key) {
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

		const delta = new Vec(0, 0)

		if (keys.has('ArrowLeft')) delta.x += 1
		if (keys.has('ArrowRight')) delta.x -= 1
		if (keys.has('ArrowUp')) delta.y += 1
		if (keys.has('ArrowDown')) delta.y -= 1

		if (delta.equals(new Vec(0, 0))) return

		if (shiftKey) delta.mul(10)

		const shape = this.editor.getShape(this.editor.getCroppingShapeId()!) as ShapeWithCrop
		if (!shape) return
		const partial = getTranslateCroppedImageChange(this.editor, shape, delta)

		if (partial) {
			if (!ephemeral) {
				// We don't want to create new marks if the user
				// is just holding down the arrow keys
				this.editor.markHistoryStoppingPoint('translate crop')
			}

			this.editor.updateShapes<ShapeWithCrop>([partial])
		}
	}
}
