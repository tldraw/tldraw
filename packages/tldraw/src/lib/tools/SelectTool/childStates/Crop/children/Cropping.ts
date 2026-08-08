import {
	Box,
	HALF_PI,
	SelectionHandle,
	ShapeWithCrop,
	StateNode,
	TLPointerEventInfo,
	Vec,
	isAccelKey,
	kickoutOccludedShapes,
	rotateSelectionHandle,
} from '@tldraw/editor'
import { getCropBox, getDefaultCrop, getUncroppedSize } from '../../../../../shapes/shared/crop'
import { GestureShapeChangeTracker } from '../../../GestureShapeChangeTracker'
import { CursorTypeMap } from '../../PointingResizeHandle'

type Snapshot = ReturnType<Cropping['createSnapshot']>

export class Cropping extends StateNode {
	static override id = 'cropping'
	static override trackPerformance = true

	info = {} as TLPointerEventInfo & {
		target: 'selection'
		handle: SelectionHandle
		onInteractionEnd?: string | (() => void)
	}

	markId = ''

	private snapshot = {} as any as Snapshot

	private changeTracker = new GestureShapeChangeTracker(
		this.editor,
		(id) => id === this.snapshot.shape?.id
	)

	override onEnter(
		info: TLPointerEventInfo & {
			target: 'selection'
			handle: SelectionHandle
			onInteractionEnd?: string | (() => void)
		}
	) {
		this.info = info
		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}
		this.markId = this.editor.markHistoryStoppingPoint('cropping')
		this.snapshot = this.createSnapshot()

		// Watch for changes made to the cropping shape from outside this interaction.
		this.changeTracker.start()

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

	override onExit() {
		this.changeTracker.stop()
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.snaps.clearIndicators()
	}

	private updateCursor() {
		const selectedShape = this.editor.getSelectedShapes()[0]
		if (!selectedShape) return

		const cursorType = CursorTypeMap[this.info.handle!]
		this.editor.setCursor({ type: cursorType, rotation: this.editor.getSelectionRotation() })
	}

	private updateShapes() {
		this.changeTracker.ignoreChanges(() => {
			const { editor } = this

			// Cropping recomputes from `snapshot + change` every update, so a change
			// made to the shape from outside this interaction would otherwise be
			// stomped. When the tracker has noticed such a change, re-anchor the
			// snapshot (resetting the origin to the current pointer) before updating.
			if (this.changeTracker.getAndClearChanged()) {
				this.snapshot = this.createSnapshot(editor.inputs.getCurrentPagePoint())
			}

			const {
				shape,
				cursorHandleOffset,
				originPagePoint: snapshotOriginPagePoint,
				initialSelectionPageBounds,
				selectionRotation,
			} = this.snapshot

			if (!shape) return
			const util = editor.getShapeUtil<ShapeWithCrop>(shape.type)
			if (!util) return

			const shiftKey = editor.inputs.getShiftKey()
			const altKey = editor.inputs.getAltKey()
			const isHoldingAccel = isAccelKey(editor.inputs)

			const currentPagePoint = editor.inputs.getCurrentPagePoint().clone().sub(cursorHandleOffset)
			const originPagePoint = snapshotOriginPagePoint.clone().sub(cursorHandleOffset)

			// Grid snapping (matches resize): snap the cropped frame to the grid.
			if (editor.getInstanceState().isGridMode && !isHoldingAccel) {
				const { gridSize } = editor.getDocumentSettings()
				currentPagePoint.snapToGrid(gridSize)
			}

			// Shape-bounds snapping: the visible crop frame is the shape's page bounds and its
			// dragged edge moves 1:1 with the unrotated drag delta, so we can reuse the same
			// snapping the resize uses. Gate it exactly like resize, and skip when rotated.
			editor.snaps.clearIndicators()
			const shouldSnap = editor.user.getIsSnapMode() ? !isHoldingAccel : isHoldingAccel
			let didSnap = false
			if (shouldSnap && initialSelectionPageBounds && selectionRotation % HALF_PI === 0) {
				const { nudge } = editor.snaps.shapeBounds.snapResizeShapes({
					dragDelta: Vec.Sub(currentPagePoint, originPagePoint),
					initialSelectionPageBounds,
					handle: rotateSelectionHandle(this.info.handle, selectionRotation),
					isAspectRatioLocked: shiftKey,
					isResizingFromCenter: altKey,
				})
				currentPagePoint.add(nudge)
				didSnap = true
			}

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
				isResizingFromCenter: altKey,
			})
			if (partial) {
				editor.updateShapes([
					{
						id: shape.id,
						type: shape.type,
						...partial,
					},
				])
			}

			// If the crop's content limit stopped the frame edge short of the snap target,
			// clear the now-misleading snap line so it doesn't float past the image content.
			if (didSnap && initialSelectionPageBounds) {
				this.reconcileSnapIndicators(
					initialSelectionPageBounds,
					Vec.Sub(currentPagePoint, originPagePoint),
					rotateSelectionHandle(this.info.handle, selectionRotation),
					shiftKey,
					altKey
				)
			}

			if (partial) this.updateCursor()
		})
	}

	private reconcileSnapIndicators(
		initialSelectionPageBounds: Box,
		snappedDelta: Vec,
		handle: SelectionHandle,
		isAspectRatioLocked: boolean,
		isResizingFromCenter: boolean
	) {
		const { editor } = this
		if (!editor.snaps.getIndicators().length) return

		const actual = editor.getShapePageBounds(this.snapshot.shape.id)
		if (!actual) return

		const { box } = Box.Resize(
			initialSelectionPageBounds,
			handle,
			isResizingFromCenter ? snappedDelta.x * 2 : snappedDelta.x,
			isResizingFromCenter ? snappedDelta.y * 2 : snappedDelta.y,
			isAspectRatioLocked
		)
		if (isResizingFromCenter) box.center = initialSelectionPageBounds.center

		const EPSILON = 1
		if (
			Math.abs(actual.minX - box.minX) > EPSILON ||
			Math.abs(actual.maxX - box.maxX) > EPSILON ||
			Math.abs(actual.minY - box.minY) > EPSILON ||
			Math.abs(actual.maxY - box.maxY) > EPSILON
		) {
			editor.snaps.clearIndicators()
		}
	}

	private complete() {
		this.updateShapes()
		kickoutOccludedShapes(this.editor, [this.snapshot.shape.id])
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, this.info)
			} else {
				onInteractionEnd()
			}
		} else {
			this.editor.setCroppingShape(null)
			this.editor.setCurrentTool('select.idle')
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.changeTracker.clear()
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, this.info)
			} else {
				onInteractionEnd()
			}
		} else {
			this.editor.setCroppingShape(null)
			this.editor.setCurrentTool('select.idle')
		}
	}

	private createSnapshot(originPagePoint = this.editor.inputs.getOriginPagePoint()) {
		const selectionRotation = this.editor.getSelectionRotation()

		const shape = this.editor.getOnlySelectedShape() as ShapeWithCrop

		const selectionBounds = this.editor.getSelectionRotatedPageBounds()!

		const dragHandlePoint = Vec.RotWith(
			selectionBounds.getHandlePoint(this.info.handle!),
			selectionBounds.point,
			selectionRotation
		)

		const cursorHandleOffset = Vec.Sub(originPagePoint, dragHandlePoint)

		// Axis-aligned page bounds of the crop frame, used for shape-bounds snapping.
		// (selectionBounds above is rotated and only used for the cursor handle offset.)
		const initialSelectionPageBounds = this.editor.getSelectionPageBounds()

		return {
			shape,
			cursorHandleOffset,
			initialSelectionPageBounds,
			selectionRotation,
			// The page point the gesture is measured from. Normally the drag origin,
			// but reset to the current pointer when the snapshot is re-anchored after
			// an external change, so the change resolves to 0 there and doesn't jump.
			originPagePoint,
		}
	}
}
