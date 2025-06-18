import {
	Editor,
	IndexKey,
	TLGroupShape,
	TLParentId,
	TLShape,
	TLShapeId,
	Vec,
	bind,
	compact,
	isShapeId,
} from '@tldraw/editor'

const SLOW_POINTER_LAG_DURATION = 320
const FAST_POINTER_LAG_DURATION = 60

/** @public */
export class DragAndDropManager {
	constructor(public editor: Editor) {
		editor.disposables.add(this.dispose)
	}

	shapesToActuallyMove: TLShape[] = []

	initialGroupIds = new Map<TLShapeId, TLShapeId>()
	initialParentIds = new Map<TLShapeId, TLParentId>()
	initialIndices = new Map<TLShapeId, IndexKey>()

	initialDraggingIntoShape?: TLShape
	prevDraggingIntoShape?: TLShape

	intervalTimerId = -1

	startDraggingShapes(movingShapes: TLShape[], point: Vec, cb: () => void) {
		const { editor } = this

		// Only start dragging if we're not already dragging
		if (this.intervalTimerId !== -1) return

		const shapesToActuallyMove = new Set(movingShapes)
		const movingGroups = new Set<TLGroupShape>()

		for (const shape of shapesToActuallyMove) {
			const parent = editor.getShapeParent(shape)
			if (parent && editor.isShapeOfType<TLGroupShape>(parent, 'group')) {
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
			shapesToActuallyMove.add(movingGroup)
			for (const child of children) {
				shapesToActuallyMove.delete(child)
			}
		}

		this.initialParentIds.clear()
		for (const shape of shapesToActuallyMove) {
			const parent = editor.getShapeParent(shape)
			if (parent) {
				this.initialParentIds.set(shape.id, parent.id)
			}
			this.initialIndices.set(shape.id, shape.index)

			const group = editor.findShapeAncestor(shape, (s) =>
				editor.isShapeOfType<TLGroupShape>(s, 'group')
			)
			if (group) {
				this.initialGroupIds.set(shape.id, group.id)
			}
		}

		const allShapes = editor.getCurrentPageShapesSorted()
		this.shapesToActuallyMove = Array.from(shapesToActuallyMove).sort(
			(a, b) => allShapes.indexOf(a) - allShapes.indexOf(b)
		)

		this.initialDraggingIntoShape = this.getDraggingOverShape(editor, point)
		this.prevDraggingIntoShape = this.initialDraggingIntoShape

		// Start the dragging interval

		// run once on first frame
		this.updateDraggingShapes(point, cb)

		// then once on an interval, skipping frames if moving quickly
		let skip2of3FramesWhileMovingFast = 0
		this.intervalTimerId = this.editor.timers.setInterval(
			() => {
				skip2of3FramesWhileMovingFast++
				if (skip2of3FramesWhileMovingFast % 3 && this.editor.inputs.pointerVelocity.len() > 0.5)
					return
				this.updateDraggingShapes(editor.inputs.currentPagePoint, cb)
			},
			movingShapes.length > 10 ? SLOW_POINTER_LAG_DURATION : FAST_POINTER_LAG_DURATION
		)
	}

	dropShapes(shapes: TLShape[]) {
		const { editor } = this
		this.updateDraggingShapes(editor.inputs.currentPagePoint)

		// The following is reusable for multi-parent-dropping behavior too...

		const droppedIntoParents = new Map<TLShape, TLShape[]>()

		for (const shape of shapes) {
			const freshShape = editor.getShape(shape.id)
			if (!freshShape) continue
			if (freshShape.parentId !== shape.parentId && isShapeId(shape.parentId)) {
				const oldParent = editor.getShape(freshShape.parentId)
				if (!oldParent) continue
				if (!droppedIntoParents.has(oldParent)) {
					droppedIntoParents.set(oldParent, [])
				}
				droppedIntoParents.get(oldParent)!.push(freshShape)
			}
		}

		droppedIntoParents.forEach((shapes, parent) => {
			const util = editor.getShapeUtil(parent)
			if (util.onDropShapesOver) {
				util.onDropShapesOver(parent, shapes)
			}
		})

		this.dispose()
	}

	clear() {
		if (this.intervalTimerId) {
			clearInterval(this.intervalTimerId)
			this.intervalTimerId = -1
		}

		this.initialParentIds.clear()
		this.initialIndices.clear()
		this.shapesToActuallyMove = []
		this.initialDraggingIntoShape = undefined
		this.prevDraggingIntoShape = undefined
		this.editor.setHintingShapes([])
	}

	@bind
	dispose() {
		this.clear()
	}

	private getDraggingOverShape(editor: Editor, point: Vec): TLShape | undefined {
		// get fresh moving shapes
		const draggingShapes = compact(this.shapesToActuallyMove.map((s) => editor.getShape(s)))

		const shapesAtPoint = editor.getShapesAtPoint(point, {
			hitInside: true,
			margin: 0,
		})

		for (const shape of shapesAtPoint) {
			const shapeUtil = editor.getShapeUtil(shape)
			if (draggingShapes.includes(shape)) continue
			if (!shapeUtil.canDropShapes(shape)) continue
			if (!draggingShapes.every((s) => shapeUtil.canDropShape(shape, s))) continue
			return shape
		}

		return
	}

	private updateDraggingShapes(point: Vec, cb?: () => void): void {
		const { editor } = this

		const currentPageId = editor.getCurrentPageId()

		// get fresh moving shapes
		const draggingShapes = compact(this.shapesToActuallyMove.map((s) => editor.getShape(s)))

		if (!draggingShapes.length) return

		const draggingIntoParent = this.getDraggingOverShape(editor, point)

		if (this.prevDraggingIntoShape?.id === draggingIntoParent?.id) return

		editor.run(() => {
			if (draggingIntoParent) {
				// dropping into the shape
				if (!draggingShapes.every((s) => s.parentId === draggingIntoParent.id)) {
					// Check to see whether any of the shapes can have their old index restored
					let canRestoreOriginalIndices = false
					const previousChildren = draggingShapes.filter(
						(s) => draggingIntoParent.id === this.initialParentIds.get(s.id)
					)
					if (previousChildren.length > 0) {
						const currentChildren = compact(
							editor.getSortedChildIdsForParent(draggingIntoParent).map((id) => editor.getShape(id))
						)
						if (previousChildren.every((s) => !currentChildren.find((c) => c.index === s.index))) {
							canRestoreOriginalIndices = true
						}
					}

					// Reparent the shapes to the new parent
					editor.reparentShapes(draggingShapes, draggingIntoParent.id)

					// If we can restore the original indices, then do so
					if (canRestoreOriginalIndices) {
						for (const shape of previousChildren) {
							editor.updateShape({
								id: shape.id,
								type: shape.type,
								index: this.initialIndices.get(shape.id),
							})
						}
					}
				}
			} else {
				if (!draggingShapes.every((s) => s.parentId === currentPageId)) {
					// dropping onto page
					editor.reparentShapes(draggingShapes, currentPageId)
				}
			}

			// The following is reusable for multi-parent-dropping behavior too...

			// Get all of the shapes that have been dragged into a new parent
			const draggedIntoParents = new Map<TLShape, TLShape[]>()
			const draggedOutOfParents = new Map<TLShape, TLShape[]>()

			for (const shape of draggingShapes) {
				const freshShape = editor.getShape(shape.id)
				if (!freshShape) continue
				if (freshShape.parentId !== shape.parentId) {
					// If the shape is being dragged out of a parent shape, then add it to the draggedOutOfParents map
					const oldParent = editor.getShape(shape.parentId)
					if (!oldParent) continue
					if (!draggedOutOfParents.has(oldParent)) {
						draggedOutOfParents.set(oldParent, [])
					}
					draggedOutOfParents.get(oldParent)!.push(freshShape)

					// If the shape is being dragged into a new parent shape, then add it to the draggedIntoParents map
					const newParent = editor.getShape(freshShape.parentId)
					if (!newParent) continue
					if (!draggedIntoParents.has(newParent)) {
						draggedIntoParents.set(newParent, [])
					}
					draggedIntoParents.get(newParent)!.push(freshShape)
				}
			}

			draggedOutOfParents.forEach((shapes, parent) => {
				const util = editor.getShapeUtil(parent)
				if (util.onDragShapesOut) {
					util.onDragShapesOut(parent, shapes)
				}
			})

			draggedIntoParents.forEach((shapes, parent) => {
				const util = editor.getShapeUtil(parent)
				if (util.onDragShapesOver) {
					util.onDragShapesOver(parent, shapes)
				}
			})

			if (draggingIntoParent) {
				editor.setHintingShapes([draggingIntoParent.id])
			} else if (this.prevDraggingIntoShape) {
				editor.setHintingShapes([])
			}

			cb?.()
		})

		this.prevDraggingIntoShape = draggingIntoParent
	}
}
