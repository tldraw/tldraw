import {
	SelectionHandle,
	StateNode,
	TLBaseShape,
	TLEnterEventHandler,
	TLEventHandlers,
	TLImageShape,
	TLImageShapeCrop,
	TLPointerEventInfo,
	TLShapePartial,
	Vec2d,
	deepCopy,
} from '@tldraw/editor'
import { MIN_CROP_SIZE } from './Crop/crop-constants'
import { CursorTypeMap } from './PointingResizeHandle'

type Snapshot = ReturnType<Cropping['createSnapshot']>

export class Cropping extends StateNode {
	static override id = 'cropping'

	info = {} as TLPointerEventInfo & {
		target: 'selection'
		handle: SelectionHandle
		onInteractionEnd?: string
	}

	markId = ''

	private snapshot = {} as any as Snapshot

	override onEnter: TLEnterEventHandler = (
		info: TLPointerEventInfo & {
			target: 'selection'
			handle: SelectionHandle
			onInteractionEnd?: string
		}
	) => {
		this.info = info
		this.markId = 'cropping'
		this.editor.mark(this.markId)
		this.snapshot = this.createSnapshot()
		this.updateShapes()
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		this.updateShapes()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private updateCursor() {
		const selectedShape = this.editor.selectedShapes[0]
		if (!selectedShape) return

		const cursorType = CursorTypeMap[this.info.handle!]
		this.editor.updateInstanceState({
			cursor: {
				type: cursorType,
				rotation: selectedShape.rotation,
			},
		})
	}

	private getDefaultCrop = (): TLImageShapeCrop => ({
		topLeft: { x: 0, y: 0 },
		bottomRight: { x: 1, y: 1 },
	})

	private updateShapes() {
		const { shape, cursorHandleOffset } = this.snapshot

		if (!shape) return
		const util = this.editor.getShapeUtil<TLImageShape>('image')
		if (!util) return

		const props = shape.props

		const currentPagePoint = this.editor.inputs.currentPagePoint.clone().sub(cursorHandleOffset)
		const originPagePoint = this.editor.inputs.originPagePoint.clone().sub(cursorHandleOffset)

		const change = currentPagePoint.clone().sub(originPagePoint).rot(-shape.rotation)

		const crop = props.crop ?? this.getDefaultCrop()
		const newCrop = deepCopy(crop)

		const newPoint = new Vec2d(shape.x, shape.y)
		const pointDelta = new Vec2d(0, 0)

		// original (uncropped) width and height of shape
		const w = (1 / (crop.bottomRight.x - crop.topLeft.x)) * props.w
		const h = (1 / (crop.bottomRight.y - crop.topLeft.y)) * props.h

		let hasCropChanged = false

		// Set y dimension
		switch (this.info.handle) {
			case 'top':
			case 'top_left':
			case 'top_right': {
				if (h < MIN_CROP_SIZE) break
				hasCropChanged = true
				// top
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
				// bottom
				newCrop.bottomRight.y = Math.min(1, newCrop.bottomRight.y + change.y / h)
				const heightAfterCrop = h * (newCrop.bottomRight.y - newCrop.topLeft.y)

				if (heightAfterCrop < MIN_CROP_SIZE) {
					newCrop.bottomRight.y = newCrop.topLeft.y + MIN_CROP_SIZE / h
				}
				break
			}
		}

		// Set x dimension
		switch (this.info.handle) {
			case 'left':
			case 'top_left':
			case 'bottom_left': {
				if (w < MIN_CROP_SIZE) break
				hasCropChanged = true
				// left
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
				// right
				newCrop.bottomRight.x = Math.min(1, newCrop.bottomRight.x + change.x / w)
				const widthAfterCrop = w * (newCrop.bottomRight.x - newCrop.topLeft.x)

				if (widthAfterCrop < MIN_CROP_SIZE) {
					newCrop.bottomRight.x = newCrop.topLeft.x + MIN_CROP_SIZE / w
				}
				break
			}
		}
		if (!hasCropChanged) return

		newPoint.add(pointDelta.rot(shape.rotation))

		const partial: TLShapePartial<
			TLBaseShape<string, { w: number; h: number; crop: TLImageShapeCrop }>
		> = {
			id: shape.id,
			type: shape.type,
			x: newPoint.x,
			y: newPoint.y,
			props: {
				crop: newCrop,
				w: (newCrop.bottomRight.x - newCrop.topLeft.x) * w,
				h: (newCrop.bottomRight.y - newCrop.topLeft.y) * h,
			},
		}

		this.editor.updateShapes([partial], { squashing: true })
		this.updateCursor()
	}

	private complete() {
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.editor.setCroppingShape(null)
			this.parent.transition('idle', {})
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.editor.setCroppingShape(null)
			this.parent.transition('idle', {})
		}
	}

	private createSnapshot() {
		const {
			selectionRotation,
			inputs: { originPagePoint },
		} = this.editor

		const shape = this.editor.onlySelectedShape as TLImageShape

		const selectionBounds = this.editor.selectionRotatedPageBounds!

		const dragHandlePoint = Vec2d.RotWith(
			selectionBounds.getHandlePoint(this.info.handle!),
			selectionBounds.point,
			selectionRotation
		)

		const cursorHandleOffset = Vec2d.Sub(originPagePoint, dragHandlePoint)

		return {
			shape,
			cursorHandleOffset,
		}
	}
}
