import {
	SelectionHandle,
	ShapeWithCrop,
	StateNode,
	TLPointerEventInfo,
	Vec,
	kickoutOccludedShapes,
} from '@tldraw/editor'
import { getCropBox, getDefaultCrop, getUncroppedSize } from '../../../../../shapes/shared/crop'
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

	override onKeyDown() {
		this.updateShapes()
	}

	override onKeyUp() {
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

		const { shiftKey } = this.editor.inputs
		const currentPagePoint = this.editor.inputs.currentPagePoint.clone().sub(cursorHandleOffset)
		const originPagePoint = this.editor.inputs.originPagePoint.clone().sub(cursorHandleOffset)
		const change = currentPagePoint.clone().sub(originPagePoint).rot(-shape.rotation)

		const crop = shape.props.crop ?? getDefaultCrop()
		const uncroppedSize = getUncroppedSize(shape.props, crop)

		const cropFn = util.onCrop?.bind(util) ?? getCropBox
		const partial = cropFn(shape, {
			handle: this.info.handle,
			change,
			crop,
			uncroppedSize,
			initialShape: this.snapshot.shape,
			aspectRatioLocked: shiftKey,
		})
		if (!partial) return

		this.editor.updateShapes([
			{
				id: shape.id,
				type: shape.type,
				...partial,
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

		return {
			shape,
			cursorHandleOffset,
		}
	}
}
