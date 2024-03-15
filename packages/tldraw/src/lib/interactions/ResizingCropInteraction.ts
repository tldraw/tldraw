import { Interaction, SelectionHandle, TLImageShape, Vec, structuredClone } from '@tldraw/editor'
import { CursorTypeMap } from '../tools/SelectTool/select-helpers'

/** @internal */
export const MIN_CROP_SIZE = 8

export class ResizingCropInteraction extends Interaction<{
	shape: TLImageShape
	handle: SelectionHandle
}> {
	readonly id = 'resizing crop'
	readonly markId = 'resizing crop'

	didCrop = false
	prevPoint = new Vec(-Infinity, -Infinity)
	cursorHandleOffset = new Vec(0, 0)

	override onStart() {
		const { editor, cursorHandleOffset } = this
		const { shape, handle } = this.info

		const selectionRotation = editor.getSelectionRotation()
		const selectionBounds = editor.getSelectionRotatedPageBounds()!
		const dragHandlePoint = Vec.RotWith(
			selectionBounds.getHandlePoint(handle),
			selectionBounds.point,
			selectionRotation
		)

		cursorHandleOffset.setTo(Vec.Sub(editor.inputs.originPagePoint, dragHandlePoint))

		editor
			.updateInstanceState({
				cursor: {
					type: CursorTypeMap[handle],
					rotation: selectionRotation,
				},
			})
			.setCroppingShape(shape)
	}

	override onUpdate() {
		const { shape: initialShape, handle } = this.info
		const { editor, cursorHandleOffset } = this

		// If the user has stopped dragging, we're done
		if (!editor.inputs.isDragging) {
			this.complete()
			return
		}

		// If the shape has gone, we're done
		const shape = this.editor.getShape(this.editor.getCroppingShapeId()!) as TLImageShape
		if (!shape) this.complete()

		if (!this.didCrop) {
			// mark when we start dragging
			editor.mark(this.markId)
			this.didCrop = true
		}

		// If the shape's been deleted, bail
		const currentShape = this.editor.getShape(initialShape)
		if (!currentShape) this.cancel()

		const util = editor.getShapeUtil<TLImageShape>('image')
		if (!util) return

		const crop = initialShape.props.crop ?? {
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 1, y: 1 },
		}

		const newCrop = structuredClone(crop)

		const pointDelta = new Vec(0, 0)

		// original (uncropped) width and height of shape
		const w = (1 / (crop.bottomRight.x - crop.topLeft.x)) * initialShape.props.w
		const h = (1 / (crop.bottomRight.y - crop.topLeft.y)) * initialShape.props.h

		let hasCropChanged = false

		const change = editor.inputs.currentPagePoint
			.clone()
			.sub(editor.inputs.originPagePoint)
			.sub(cursorHandleOffset)
			.rot(-initialShape.rotation)

		// Set y dimension
		switch (handle) {
			case 'top':
			case 'top_left':
			case 'top_right': {
				if (h < MIN_CROP_SIZE) break
				hasCropChanged = true
				newCrop.topLeft.y = newCrop.topLeft.y + change.y / h
				const heightAfterCrop = h * (newCrop.bottomRight.y - newCrop.topLeft.y)
				if (heightAfterCrop < MIN_CROP_SIZE) {
					newCrop.topLeft.y = newCrop.bottomRight.y - MIN_CROP_SIZE / h
					pointDelta.y = (newCrop.topLeft.y - crop.topLeft.y) * h
				} else {
					if (newCrop.topLeft.y <= 0) {
						newCrop.topLeft.y = 0
						pointDelta.y = (newCrop.topLeft.y - crop.topLeft.y) * h
					} else {
						pointDelta.y = change.y
					}
				}
				break
			}
			case 'bottom':
			case 'bottom_left':
			case 'bottom_right': {
				if (h < MIN_CROP_SIZE) break
				hasCropChanged = true
				newCrop.bottomRight.y = Math.min(1, newCrop.bottomRight.y + change.y / h)
				const heightAfterCrop = h * (newCrop.bottomRight.y - newCrop.topLeft.y)
				if (heightAfterCrop < MIN_CROP_SIZE) {
					newCrop.bottomRight.y = newCrop.topLeft.y + MIN_CROP_SIZE / h
				}
				break
			}
		}

		// Set x dimension
		switch (handle) {
			case 'left':
			case 'top_left':
			case 'bottom_left': {
				if (w < MIN_CROP_SIZE) break
				hasCropChanged = true
				newCrop.topLeft.x = newCrop.topLeft.x + change.x / w
				const widthAfterCrop = w * (newCrop.bottomRight.x - newCrop.topLeft.x)
				if (widthAfterCrop < MIN_CROP_SIZE) {
					newCrop.topLeft.x = newCrop.bottomRight.x - MIN_CROP_SIZE / w
					pointDelta.x = (newCrop.topLeft.x - crop.topLeft.x) * w
				} else {
					if (newCrop.topLeft.x <= 0) {
						newCrop.topLeft.x = 0
						pointDelta.x = (newCrop.topLeft.x - crop.topLeft.x) * w
					} else {
						pointDelta.x = change.x
					}
				}
				break
			}
			case 'right':
			case 'top_right':
			case 'bottom_right': {
				if (w < MIN_CROP_SIZE) break
				hasCropChanged = true
				newCrop.bottomRight.x = Math.min(1, newCrop.bottomRight.x + change.x / w)
				const widthAfterCrop = w * (newCrop.bottomRight.x - newCrop.topLeft.x)
				if (widthAfterCrop < MIN_CROP_SIZE) {
					newCrop.bottomRight.x = newCrop.topLeft.x + MIN_CROP_SIZE / w
				}
				break
			}
		}

		if (!hasCropChanged) return

		const newPoint = new Vec(initialShape.x, initialShape.y).add(
			pointDelta.rot(initialShape.rotation)
		)

		editor
			.updateShape<TLImageShape>(
				{
					...initialShape,
					x: newPoint.x,
					y: newPoint.y,
					props: {
						crop: newCrop,
						w: (newCrop.bottomRight.x - newCrop.topLeft.x) * w,
						h: (newCrop.bottomRight.y - newCrop.topLeft.y) * h,
					},
				},
				{ squashing: true }
			)
			.updateInstanceState({
				cursor: {
					type: CursorTypeMap[handle],
					rotation: editor.getSelectionRotation(),
				},
			})

		return
	}

	override onComplete() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onCancel() {
		this.editor.bailToMark(this.markId)
	}

	override onEnd() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}
}
