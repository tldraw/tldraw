import { TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import type { Editor } from '../editor/Editor'
import { Box, SelectionCorner, SelectionEdge, rotateSelectionHandle } from '../primitives/Box'
import { Mat } from '../primitives/Mat'
import { HALF_PI, areAnglesCompatible } from '../primitives/utils'
import { Vec, VecLike } from '../primitives/Vec'
import { isAccelKey } from '../utils/keyboard'

/** @public */
export interface ResizeSnapshot {
	shapeSnapshots: Map<
		TLShapeId,
		{
			shape: TLShape
			bounds: Box
			pageTransform: Mat
			pageRotation: number
			isAspectRatioLocked: boolean
		}
	>
	selectionBounds: Box
	cursorHandleOffset: VecLike
	selectionRotation: number
	selectedShapeIds: TLShapeId[]
	canShapesDeform: boolean
	initialSelectionPageBounds: Box
	frames: { id: TLShapeId; children: TLShape[] }[]
}

/** @public */
export interface ResizeInteractionStartOpts {
	handle: SelectionEdge | SelectionCorner
	creationCursorOffset?: VecLike
}

/** @public */
export interface ResizeInteractionUpdateResult {
	cursor?: {
		dragHandle: SelectionCorner | SelectionEdge
		isFlippedX: boolean
		isFlippedY: boolean
		rotation: number
	}
}

/**
 * Manages the core resize logic for interactive resize operations.
 *
 * The interaction calls `editor.resizeShape()` per shape (the per-shape
 * primitive stays on Editor). Frame children alt-key repositioning
 * logic is included here.
 *
 * @public
 */
export class ResizeInteraction {
	snapshot: ResizeSnapshot | null = null
	private didHoldCommand = false
	private handle: SelectionEdge | SelectionCorner = 'bottom_right'
	private creationCursorOffset: VecLike = { x: 0, y: 0 }

	constructor(public editor: Editor) {}

	/**
	 * Create a snapshot and call `onResizeStart` on all shapes.
	 * Returns `false` if there's nothing to resize.
	 */
	start(opts: ResizeInteractionStartOpts): boolean {
		this.handle = opts.handle
		this.creationCursorOffset = opts.creationCursorOffset ?? { x: 0, y: 0 }
		this.didHoldCommand = false

		try {
			this.snapshot = this._createSnapshot()
		} catch {
			return false
		}

		this.handleResizeStart()
		return true
	}

	/**
	 * Recompute transforms from the snapshot + current editor.inputs.
	 * Returns cursor metadata for the state node.
	 */
	update(opts?: { isCreating?: boolean }): ResizeInteractionUpdateResult {
		if (!this.snapshot) return {}

		const altKey = this.editor.inputs.getAltKey()
		const shiftKey = this.editor.inputs.getShiftKey()
		const {
			frames,
			shapeSnapshots,
			selectionBounds,
			cursorHandleOffset,
			selectedShapeIds,
			selectionRotation,
			canShapesDeform,
		} = this.snapshot

		let isAspectRatioLocked = shiftKey || !canShapesDeform

		if (shapeSnapshots.size === 1) {
			const onlySnapshot = [...shapeSnapshots.values()][0]!
			if (this.editor.isShapeOfType(onlySnapshot.shape, 'text')) {
				isAspectRatioLocked = !(this.handle === 'left' || this.handle === 'right')
			}
		}

		const isHoldingAccel = isAccelKey(this.editor.inputs)

		const currentPagePoint = this.editor.inputs
			.getCurrentPagePoint()
			.clone()
			.sub(cursorHandleOffset)
			.sub(this.creationCursorOffset)

		const originPagePoint = this.editor.inputs.getOriginPagePoint().clone().sub(cursorHandleOffset)

		if (this.editor.getInstanceState().isGridMode && !isHoldingAccel) {
			const { gridSize } = this.editor.getDocumentSettings()
			currentPagePoint.snapToGrid(gridSize)
		}

		const dragHandle = this.handle as SelectionCorner | SelectionEdge
		const scaleOriginHandle = rotateSelectionHandle(dragHandle, Math.PI)

		this.editor.snaps.clearIndicators()

		const shouldSnap = this.editor.user.getIsSnapMode() ? !isHoldingAccel : isHoldingAccel

		if (shouldSnap && selectionRotation % HALF_PI === 0) {
			const { nudge } = this.editor.snaps.shapeBounds.snapResizeShapes({
				dragDelta: Vec.Sub(currentPagePoint, originPagePoint),
				initialSelectionPageBounds: this.snapshot.initialSelectionPageBounds,
				handle: rotateSelectionHandle(dragHandle, selectionRotation),
				isAspectRatioLocked,
				isResizingFromCenter: altKey,
			})

			currentPagePoint.add(nudge)
		}

		const scaleOriginPage = Vec.RotWith(
			altKey ? selectionBounds.center : selectionBounds.getHandlePoint(scaleOriginHandle),
			selectionBounds.point,
			selectionRotation
		)

		const distanceFromScaleOriginNow = Vec.Sub(currentPagePoint, scaleOriginPage).rot(
			-selectionRotation
		)

		const distanceFromScaleOriginAtStart = Vec.Sub(originPagePoint, scaleOriginPage).rot(
			-selectionRotation
		)

		const scale = Vec.DivV(distanceFromScaleOriginNow, distanceFromScaleOriginAtStart)

		if (!Number.isFinite(scale.x)) scale.x = 1
		if (!Number.isFinite(scale.y)) scale.y = 1

		const isXLocked = dragHandle === 'top' || dragHandle === 'bottom'
		const isYLocked = dragHandle === 'left' || dragHandle === 'right'

		if (isAspectRatioLocked) {
			if (isYLocked) {
				scale.y = Math.abs(scale.x)
			} else if (isXLocked) {
				scale.x = Math.abs(scale.y)
			} else if (Math.abs(scale.x) > Math.abs(scale.y)) {
				scale.y = Math.abs(scale.x) * (scale.y < 0 ? -1 : 1)
			} else {
				scale.x = Math.abs(scale.y) * (scale.x < 0 ? -1 : 1)
			}
		} else {
			if (isXLocked) {
				scale.x = 1
			}
			if (isYLocked) {
				scale.y = 1
			}
		}

		for (const id of shapeSnapshots.keys()) {
			const snapshot = shapeSnapshots.get(id)!

			this.editor.resizeShape(id, scale, {
				initialShape: snapshot.shape,
				initialBounds: snapshot.bounds,
				initialPageTransform: snapshot.pageTransform,
				dragHandle,
				mode:
					selectedShapeIds.length === 1 && id === selectedShapeIds[0]
						? 'resize_bounds'
						: 'scale_shape',
				scaleOrigin: scaleOriginPage,
				isAspectRatioLocked,
				scaleAxisRotation: selectionRotation,
				skipStartAndEndCallbacks: true,
			})
		}

		// Frame children: preserve positions when holding accel key
		if (isHoldingAccel) {
			this.didHoldCommand = true

			for (const { id, children } of frames) {
				if (!children.length) continue
				const initial = shapeSnapshots.get(id)!.shape
				const current = this.editor.getShape(id)!
				if (!(initial && current)) continue

				const dx = current.x - initial.x
				const dy = current.y - initial.y

				const delta = new Vec(dx, dy).rot(-initial.rotation)

				if (delta.x !== 0 || delta.y !== 0) {
					for (const child of children) {
						this.editor.updateShape({
							id: child.id,
							type: child.type,
							x: child.x - delta.x,
							y: child.y - delta.y,
						})
					}
				}
			}
		} else if (this.didHoldCommand) {
			this.didHoldCommand = false

			for (const { children } of frames) {
				if (!children.length) continue
				for (const child of children) {
					this.editor.updateShape({
						id: child.id,
						type: child.type,
						x: child.x,
						y: child.y,
					})
				}
			}
		}

		const cursorResult: ResizeInteractionUpdateResult = {}
		if (!opts?.isCreating) {
			cursorResult.cursor = {
				dragHandle,
				isFlippedX: scale.x < 0,
				isFlippedY: scale.y < 0,
				rotation: selectionRotation,
			}
		}

		return cursorResult
	}

	/**
	 * Finalize resize: call `onResizeEnd` on all shapes.
	 */
	complete(): void {
		if (!this.snapshot) return

		this.handleResizeEnd()
		this.snapshot = null
	}

	/**
	 * Cancel resize: call `onResizeCancel` on all shapes.
	 * The caller is responsible for bailing to a mark.
	 */
	cancel(): void {
		if (!this.snapshot) return

		this.snapshot.shapeSnapshots.forEach(({ shape }) => {
			const current = this.editor.getShape(shape.id)
			if (current) {
				const util = this.editor.getShapeUtil(shape)
				util.onResizeCancel?.(shape, current)
			}
		})

		this.snapshot = null
	}

	private handleResizeStart() {
		if (!this.snapshot) return

		const changes: TLShapePartial[] = []

		this.snapshot.shapeSnapshots.forEach(({ shape }) => {
			const util = this.editor.getShapeUtil(shape)
			const change = util.onResizeStart?.(shape)
			if (change) changes.push(change)
		})

		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}
	}

	private handleResizeEnd() {
		if (!this.snapshot) return

		const changes: TLShapePartial[] = []

		this.snapshot.shapeSnapshots.forEach(({ shape }) => {
			const current = this.editor.getShape(shape.id)!
			const util = this.editor.getShapeUtil(shape)
			const change = util.onResizeEnd?.(shape, current)
			if (change) changes.push(change)
		})

		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}
	}

	private _createSnapshot(): ResizeSnapshot {
		const { editor } = this
		const selectedShapeIds = editor.getSelectedShapeIds()
		const selectionRotation = editor.getSelectionRotation()
		const originPagePoint = editor.inputs.getOriginPagePoint()

		const selectionBounds = editor.getSelectionRotatedPageBounds()
		if (!selectionBounds) throw Error('Resizing but nothing is selected')

		const dragHandlePoint = Vec.RotWith(
			selectionBounds.getHandlePoint(this.handle!),
			selectionBounds.point,
			selectionRotation
		)

		const cursorHandleOffset = Vec.Sub(originPagePoint, dragHandlePoint)

		const shapeSnapshots = new Map<
			TLShapeId,
			{
				shape: TLShape
				bounds: Box
				pageTransform: Mat
				pageRotation: number
				isAspectRatioLocked: boolean
			}
		>()

		const frames: { id: TLShapeId; children: TLShape[] }[] = []

		const populateResizingShapes = (shapeId: TLShapeId): false | undefined => {
			const shape = editor.getShape(shapeId)
			if (!shape) return false

			const util = editor.getShapeUtil(shape)

			if (util.canResize(shape)) {
				const pageTransform = editor.getShapePageTransform(shape)!
				shapeSnapshots.set(shape.id, {
					shape,
					bounds: editor.getShapeGeometry(shape).bounds,
					pageTransform,
					pageRotation: Mat.Decompose(pageTransform).rotation,
					isAspectRatioLocked: util.isAspectRatioLocked(shape),
				})
			}

			if (editor.isShapeOfType(shape, 'frame')) {
				frames.push({
					id: shape.id,
					children: compact(
						editor.getSortedChildIdsForParent(shape).map((id) => editor.getShape(id))
					),
				})
			}

			if (!util.canResizeChildren(shape)) return false

			return undefined
		}

		selectedShapeIds.forEach((shapeId) => {
			const keepDescending = populateResizingShapes(shapeId)
			if (keepDescending === false) return
			editor.visitDescendants(shapeId, populateResizingShapes)
		})

		const canShapesDeform = ![...shapeSnapshots.values()].some(
			(shape) =>
				!areAnglesCompatible(shape.pageRotation, selectionRotation) || shape.isAspectRatioLocked
		)

		return {
			shapeSnapshots,
			selectionBounds,
			cursorHandleOffset,
			selectionRotation,
			selectedShapeIds,
			canShapesDeform,
			initialSelectionPageBounds: editor.getSelectionPageBounds()!,
			frames,
		}
	}
}
