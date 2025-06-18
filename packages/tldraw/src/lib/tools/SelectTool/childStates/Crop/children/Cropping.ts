import { SelectionHandle, ShapeWithCrop, StateNode, TLPointerEventInfo, Vec } from '@tldraw/editor'
import { getCropBox, getDefaultCrop, getUncroppedSize } from '../../../../../shapes/shared/crop'
import { kickoutOccludedShapes } from '../../../selectHelpers'
import { CursorTypeMap } from '../../PointingResizeHandle'

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

	override onEnter(
		info: TLPointerEventInfo & {
			target: 'selection'
			handle: SelectionHandle
			onInteractionEnd?: string
		}
	) {
		this.info = info
		this.markId = this.editor.markHistoryStoppingPoint('cropping')
		this.snapshot = this.createSnapshot()
		this.updateShapes()
	}

	override onPointerMove() {
		this.updateShapes()
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	private updateCursor() {
		const selectedShape = this.editor.getSelectedShapes()[0]
		if (!selectedShape) return

		const cursorType = CursorTypeMap[this.info.handle!]
		this.editor.setCursor({ type: cursorType, rotation: this.editor.getSelectionRotation() })
	}

	private updateShapes() {
		const { shape, cursorHandleOffset } = this.snapshot

		if (!shape) return
		const util = this.editor.getShapeUtil<ShapeWithCrop>(shape.type)
		if (!util) return

		const currentPagePoint = this.editor.inputs.currentPagePoint.clone().sub(cursorHandleOffset)
		const originPagePoint = this.editor.inputs.originPagePoint.clone().sub(cursorHandleOffset)

		const change = currentPagePoint.clone().sub(originPagePoint).rot(-shape.rotation)

		const crop = shape.props.crop ?? getDefaultCrop()
		const uncroppedSize = getUncroppedSize(shape.props, crop)

		let dx = change.x
		let dy = change.y

		const { altKey, shiftKey } = this.editor.inputs

		const isXLocked = this.info.handle === 'top' || this.info.handle === 'bottom'
		const isYLocked = this.info.handle === 'left' || this.info.handle === 'right'

		if (shiftKey) {
			if (isYLocked) {
				dy = dx / this.snapshot.aspectRatio
			} else if (isXLocked) {
				dx = dy * this.snapshot.aspectRatio
			} else if (Math.abs(dx) > Math.abs(dy)) {
				dy = (Math.abs(dx) / this.snapshot.aspectRatio) * (dy < 0 ? -1 : 1)
			} else {
				dx = Math.abs(dy) * this.snapshot.aspectRatio * (dx < 0 ? -1 : 1)
			}
		}

		if (altKey) {
			dx *= 2
			dy *= 2
		}

		const cropFn = util.onCrop?.bind(util) ?? getCropBox
		const partial = cropFn(shape, {
			handle: this.info.handle,
			change: new Vec(dx, dy),
			crop,
			uncroppedSize,
			initialShape: this.snapshot.shape,
		})
		if (!partial) return
		const result: any = { ...partial }

		if (altKey && result.props?.crop) {
			const adjust = new Vec(-dx / 2, -dy / 2)
			const offset = adjust.clone().rot(shape.rotation)
			result.x += offset.x
			result.y += offset.y
			result.props.crop.topLeft.x -= adjust.x / uncroppedSize.w
			result.props.crop.bottomRight.x -= adjust.x / uncroppedSize.w
			result.props.crop.topLeft.y -= adjust.y / uncroppedSize.h
			result.props.crop.bottomRight.y -= adjust.y / uncroppedSize.h
			result.props.crop.topLeft.x = Math.max(0, result.props.crop.topLeft.x)
			result.props.crop.topLeft.y = Math.max(0, result.props.crop.topLeft.y)
			result.props.crop.bottomRight.x = Math.min(1, result.props.crop.bottomRight.x)
			result.props.crop.bottomRight.y = Math.min(1, result.props.crop.bottomRight.y)
		}

		this.editor.updateShapes([
			{
				id: shape.id,
				type: shape.type,
				...result,
			},
		])
		this.updateCursor()
	}

	private complete() {
		this.updateShapes()
		kickoutOccludedShapes(this.editor, [this.snapshot.shape.id])
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.editor.setCroppingShape(null)
			this.editor.setCurrentTool('select.idle')
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.editor.setCroppingShape(null)
			this.editor.setCurrentTool('select.idle')
		}
	}

	private createSnapshot() {
		const selectionRotation = this.editor.getSelectionRotation()
		const {
			inputs: { originPagePoint },
		} = this.editor

		const shape = this.editor.getOnlySelectedShape() as ShapeWithCrop

		const selectionBounds = this.editor.getSelectionRotatedPageBounds()!

		const dragHandlePoint = Vec.RotWith(
			selectionBounds.getHandlePoint(this.info.handle!),
			selectionBounds.point,
			selectionRotation
		)

		const cursorHandleOffset = Vec.Sub(originPagePoint, dragHandlePoint)

		const crop = shape.props.crop ?? getDefaultCrop()
		const uncroppedSize = getUncroppedSize(shape.props, crop)
		const cropWidth = crop.bottomRight.x - crop.topLeft.x
		const cropHeight = crop.bottomRight.y - crop.topLeft.y

		return {
			shape,
			cursorHandleOffset,
			crop,
			uncroppedSize,
			aspectRatio: cropWidth / cropHeight,
			cropCenter: {
				x: crop.topLeft.x + cropWidth / 2,
				y: crop.topLeft.y + cropHeight / 2,
			},
		}
	}
}
