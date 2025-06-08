import {
	Editor,
	IndexKey,
	TLGroupShape,
	TLParentId,
	TLShape,
	TLShapeId,
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

	initialDraggingIntoShape?: TLShape
	prevDraggingIntoShape?: TLShape

	initialParentids = new Map<TLShapeId, TLParentId>()
	initialIndices = new Map<TLShapeId, IndexKey>()
	initialGroupId = new Map<TLShapeId, TLShapeId>()

	prevDroppingShape?: TLShape

	timerId?: any

	first = true

	private onDragStart(movingShapes: TLShape[]) {
		const { editor } = this

		this.clear()

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
			if (children.every((c) => shapesToActuallyMove.has(c))) {
				for (const child of children) {
					shapesToActuallyMove.delete(child)
				}
				shapesToActuallyMove.add(movingGroup)
			}
		}

		this.initialParentids.clear()
		for (const shape of shapesToActuallyMove) {
			const parent = editor.getShapeParent(shape)
			if (parent) {
				this.initialParentids.set(shape.id, parent.id)
			}
			this.initialIndices.set(shape.id, shape.index)
		}

		const allShapes = editor.getCurrentPageShapesSorted()
		this.shapesToActuallyMove = Array.from(shapesToActuallyMove).sort(
			(a, b) => allShapes.indexOf(a) - allShapes.indexOf(b)
		)

		this.initialDraggingIntoShape = this.getDraggingIntoShape(editor)
		this.prevDraggingIntoShape = this.initialDraggingIntoShape
	}

	updateDroppingNode(movingShapes: TLShape[], cb: () => void) {
		if (this.first) {
			this.onDragStart(movingShapes)
			this.first = false
		}

		if (!this.timerId) {
			this.startDroppingNodeInterval(movingShapes, cb)
		}
	}

	private startDroppingNodeInterval(movingShapes: TLShape[], cb: () => void) {
		// run once on first frame
		this.handleDrag(cb)

		// then once on an interval, skipping frames if moving quickly
		let skip2of3FramesWhileMovingFast = 0
		this.timerId = this.editor.timers.setInterval(
			() => {
				skip2of3FramesWhileMovingFast++
				if (skip2of3FramesWhileMovingFast % 3 && this.editor.inputs.pointerVelocity.len() > 0.5)
					return
				this.handleDrag(cb)
			},
			movingShapes.length > 10 ? SLOW_POINTER_LAG_DURATION : FAST_POINTER_LAG_DURATION
		)
	}

	private stopDroppingNodeTimer() {
		if (this.timerId) {
			clearInterval(this.timerId)
			this.timerId = undefined
		}
	}

	private handleDrag(cb?: () => void) {
		const { editor } = this

		const currentPageId = editor.getCurrentPageId()

		// get fresh moving shapes
		const draggingShapes = compact(this.shapesToActuallyMove.map((s) => editor.getShape(s)))

		const draggingIntoParent = this.getDraggingIntoShape(editor)

		if (this.prevDraggingIntoShape?.id === draggingIntoParent?.id) return

		editor.run(() => {
			if (draggingIntoParent) {
				// dropping into the shape
				if (!draggingShapes.every((s) => s.parentId === draggingIntoParent.id)) {
					// Check to see whether any of the shapes can have their old index restored

					let canRestoreOriginalIndices = false
					const previousChildren = draggingShapes.filter(
						(s) => draggingIntoParent.id === this.initialParentids.get(s.id)
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

	dropShapes(shapes: TLShape[]) {
		const { editor } = this
		this.handleDrag()

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
	}

	clear() {
		this.prevDroppingShape = undefined
		this.initialParentids.clear()

		this.stopDroppingNodeTimer()

		this.editor.setHintingShapes([])
		this.first = true
	}

	@bind
	dispose() {
		this.clear()
	}

	private getDraggingIntoShape(editor: Editor) {
		// get fresh moving shapes
		const draggingShapes = compact(this.shapesToActuallyMove.map((s) => editor.getShape(s)))

		// 1. Determine which shapes we're actually moving. If a shape is part of a group
		// and all of the group's children are moving, then we're moving the group instead
		// of its children.

		const shapesAtPoint = editor.getShapesAtPoint(editor.inputs.currentPagePoint, {
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
}
