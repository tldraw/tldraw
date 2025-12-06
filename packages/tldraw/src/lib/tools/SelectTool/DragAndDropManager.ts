import { Editor, TLShape, TLShapeId, Vec, VecLike, bind, compact } from '@tldraw/editor'
import { getOccludedChildren } from './selectHelpers'

const SLOW_POINTER_LAG_DURATION = 320
const FAST_POINTER_LAG_DURATION = 60

/** @public */
export class DragAndDropManager {
	constructor(public editor: Editor) {
		editor.disposables.add(this.dispose)
	}

	shapesToActuallyMove: TLShape[] = []
	draggedOverShapeIds = new Set<TLShapeId>()

	initialGroupIds = new Map<TLShapeId, TLShapeId>()
	initialParentIds = new Map<TLShapeId, TLParentId>()
	initialIndices = new Map<TLShapeId, IndexKey>()

	initialDraggingOverShape?: TLShape
	prevDraggingOverShape?: TLShape
	prevPagePoint = new Vec()

	intervalTimerId = -1

	startDraggingShapes(movingShapes: TLShape[], point: Vec, cb: () => void) {
		const { editor } = this

		// Only start dragging if we're not already dragging
		if (this.intervalTimerId !== -1) return

		const shapesToActuallyMove = new Set(movingShapes)
		const movingGroups = new Set<TLGroupShape>()

		for (const shape of shapesToActuallyMove) {
			const parent = editor.getShapeParent(shape)
			if (parent && editor.isShapeOfType(parent, 'group')) {
				if (!movingGroups.has(parent)) {
					movingGroups.add(parent)
				}
			}
		}

		// If all of a group's children are moving, then move the group instead
		for (const movingGroup of movingGroups) {
			const children = compact(
				editor.getSortedChildIdsForParent(movingGroup).map((id) => editor.getShape(id))
			)

			this.prevDroppingShapeId =
				this.editor.getDroppingOverShape(this.editor.inputs.getOriginPagePoint(), movingShapes)
					?.id ?? null
			this.first = false
		}

		if (this.droppingNodeTimer === null) {
			this.setDragTimer(movingShapes, INITIAL_POINTER_LAG_DURATION, cb)
		} else if (Vec.Len(this.editor.inputs.getPointerVelocity()) > 0.5) {
			clearTimeout(this.droppingNodeTimer)
			this.setDragTimer(movingShapes, FAST_POINTER_LAG_DURATION, cb)
		}
	}

	private setDragTimer(movingShapes: TLShape[], duration: number, cb: () => void) {
		this.droppingNodeTimer = this.editor.timers.setTimeout(() => {
			this.editor.run(() => {
				this.handleDrag(this.editor.inputs.getCurrentPagePoint(), movingShapes, cb)
			})
			this.droppingNodeTimer = null
		}, duration)
	}

	private handleDrag(point: VecLike, movingShapes: TLShape[], cb?: () => void) {
		movingShapes = compact(movingShapes.map((shape) => this.editor.getShape(shape.id)))

		const nextDroppingShapeId = this.editor.getDroppingOverShape(point, movingShapes)?.id ?? null

		// is the next dropping shape id different than the last one?
		if (nextDroppingShapeId === this.prevDroppingShapeId) {
			this.hintParents(movingShapes)
			return
		}

		// the old previous one
		const { prevDroppingShapeId } = this

		const prevDroppingShape = prevDroppingShapeId && this.editor.getShape(prevDroppingShapeId)
		const nextDroppingShape = nextDroppingShapeId && this.editor.getShape(nextDroppingShapeId)

		// Even if we don't have a next dropping shape id (i.e. if we're dropping
		// onto the page) set the prev to the current, to avoid repeat calls to
		// the previous parent's onDragShapesOut

		if (prevDroppingShape) {
			this.editor.getShapeUtil(prevDroppingShape).onDragShapesOut?.(prevDroppingShape, movingShapes)
		}

		if (nextDroppingShape) {
			this.editor
				.getShapeUtil(nextDroppingShape)
				.onDragShapesOver?.(nextDroppingShape, movingShapes)
		}

		this.hintParents(movingShapes)
		cb?.()

		// next -> curr
		this.prevDroppingShapeId = nextDroppingShapeId
	}

	hintParents(movingShapes: TLShape[]) {
		// Group moving shapes by their ancestor
		const shapesGroupedByAncestor = new Map<TLShapeId, TLShapeId[]>()
		for (const shape of movingShapes) {
			const ancestor = this.editor.findShapeAncestor(shape, (v) => v.type !== 'group')
			if (!ancestor) continue
			if (!shapesGroupedByAncestor.has(ancestor.id)) {
				shapesGroupedByAncestor.set(ancestor.id, [])
			}
			shapesGroupedByAncestor.get(ancestor.id)!.push(shape.id)
		}

		// Only hint an ancestor if some shapes will drop into it on pointer up
		const hintingShapes = []
		for (const [ancestorId, shapeIds] of shapesGroupedByAncestor) {
			const ancestor = this.editor.getShape(ancestorId)
			if (!ancestor) continue
			// If all of the ancestor's children would be occluded, then don't hint it
			// 1. get the number of fully occluded children
			// 2. if that number is less than the number of moving shapes, hint the ancestor
			if (getOccludedChildren(this.editor, ancestor).length < shapeIds.length) {
				hintingShapes.push(ancestor.id)
			}
		}

		this.initialParentIds.clear()
		for (const shape of shapesToActuallyMove) {
			const parent = editor.getShapeParent(shape)
			if (parent) {
				this.initialParentIds.set(shape.id, parent.id)
			}
			this.initialIndices.set(shape.id, shape.index)

			const group = editor.findShapeAncestor(shape, (s) => editor.isShapeOfType(s, 'group'))
			if (group) {
				this.initialGroupIds.set(shape.id, group.id)
			}
		}

		const allShapes = editor.getCurrentPageShapesSorted()
		this.shapesToActuallyMove = Array.from(shapesToActuallyMove)
			.filter((s) => !s.isLocked)
			.sort((a, b) => allShapes.indexOf(a) - allShapes.indexOf(b))

		this.initialDraggingOverShape = editor.getDraggingOverShape(point, this.shapesToActuallyMove)
		this.prevDraggingOverShape = this.initialDraggingOverShape

		// run once on first frame
		this.updateDraggingShapes(point, cb)

		// then once on an interval, skipping frames if moving quickly
		let skip2of3FramesWhileMovingFast = 0
		this.intervalTimerId = this.editor.timers.setInterval(
			() => {
				skip2of3FramesWhileMovingFast++
				if (skip2of3FramesWhileMovingFast % 3 && this.editor.inputs.getPointerVelocity().len() > 0.5) {
					return
				}
				this.updateDraggingShapes(editor.inputs.currentPagePoint, cb)
			},
			movingShapes.length > 10 ? SLOW_POINTER_LAG_DURATION : FAST_POINTER_LAG_DURATION
		)
	}

	dropShapes(shapes: TLShape[]) {
		const { editor } = this
		this.updateDraggingShapes(editor.inputs.currentPagePoint)

		this.handleDrag(this.editor.inputs.getCurrentPagePoint(), shapes)

		if (draggingOverShape) {
			const util = editor.getShapeUtil(draggingOverShape)
			util.onDropShapesOver?.(draggingOverShape, shapes, {
				initialDraggingOverShapeId: this.initialDraggingOverShape?.id ?? null,
				initialParentIds: this.initialParentIds,
				initialIndices: this.initialIndices,
			})
		}

		this.dispose()
	}

	clear() {
		clearInterval(this.intervalTimerId)
		this.intervalTimerId = -1

		this.initialParentIds.clear()
		this.initialIndices.clear()
		this.shapesToActuallyMove = []
		this.initialDraggingOverShape = undefined
		this.prevDraggingOverShape = undefined
		this.editor.setHintingShapes([])
	}

	@bind
	dispose() {
		this.clear()
	}

	private updateDraggingShapes(point: Vec, cb?: () => void): void {
		const { editor } = this

		// get fresh moving shapes
		const draggingShapes = compact(this.shapesToActuallyMove.map((s) => editor.getShape(s)))

		if (!draggingShapes.length) return

		// This is the shape under the pointer that can handle at least one of the dragging shapes
		const nextDraggingOverShape = editor.getDraggingOverShape(point, this.shapesToActuallyMove)

		const cursorDidMove = !this.prevPagePoint.equals(editor.inputs.currentPagePoint)
		this.prevPagePoint.setTo(editor.inputs.currentPagePoint)

		editor.run(() => {
			if (this.prevDraggingOverShape?.id === nextDraggingOverShape?.id) {
				if (
					cursorDidMove &&
					nextDraggingOverShape &&
					isShapeId(nextDraggingOverShape.id) &&
					!editor.inputs.previousPagePoint.equals(editor.inputs.currentPagePoint)
				) {
					// If the cursor moved, call onDragShapesOver for the previous dragging over shape
					const util = editor.getShapeUtil(nextDraggingOverShape)
					util.onDragShapesOver?.(nextDraggingOverShape, draggingShapes, {
						initialDraggingOverShapeId: this.initialDraggingOverShape?.id ?? null,
						initialParentIds: this.initialParentIds,
						initialIndices: this.initialIndices,
					})
				}
				return
			}

			if (this.prevDraggingOverShape) {
				const util = editor.getShapeUtil(this.prevDraggingOverShape)
				util.onDragShapesOut?.(this.editor.getShape(this.prevDraggingOverShape)!, draggingShapes, {
					nextDraggingOverShapeId: nextDraggingOverShape?.id ?? null,
					initialDraggingOverShapeId: this.initialDraggingOverShape?.id ?? null,
					initialParentIds: this.initialParentIds,
					initialIndices: this.initialIndices,
				})
			}

			if (nextDraggingOverShape) {
				const util = editor.getShapeUtil(nextDraggingOverShape)
				util.onDragShapesIn?.(nextDraggingOverShape, draggingShapes, {
					initialDraggingOverShapeId: this.initialDraggingOverShape?.id ?? null,
					prevDraggingOverShapeId: this.prevDraggingOverShape?.id ?? null,
					initialParentIds: this.initialParentIds,
					initialIndices: this.initialIndices,
				})
				editor.setHintingShapes([nextDraggingOverShape.id])
			} else if (this.prevDraggingOverShape) {
				editor.setHintingShapes([])
			}

			// This is the reparenting logic
			cb?.()
		})

		this.prevDraggingOverShape = nextDraggingOverShape
	}
}
