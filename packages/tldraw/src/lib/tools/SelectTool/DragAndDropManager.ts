import { Editor, TLShape, TLShapeId, Vec, compact } from '@tldraw/editor'
import { getOccludedChildren } from './selectHelpers'

const INITIAL_POINTER_LAG_DURATION = 20
const FAST_POINTER_LAG_DURATION = 100

/** @public */
export class DragAndDropManager {
	constructor(public editor: Editor) {
		editor.disposables.add(this.dispose)
	}

	prevDroppingShapeId: TLShapeId | null = null

	droppingNodeTimer: ReturnType<typeof setTimeout> | null = null

	first = true

	updateDroppingNode(movingShapes: TLShape[], cb: () => void) {
		if (this.first) {
			this.editor.setHintingShapes(
				movingShapes
					.map((s) => this.editor.findShapeAncestor(s, (v) => v.type !== 'group'))
					.filter((s) => s) as TLShape[]
			)

			this.prevDroppingShapeId =
				this.editor.getDroppingOverShape(this.editor.inputs.originPagePoint, movingShapes)?.id ??
				null
			this.first = false
		}

		if (this.droppingNodeTimer === null) {
			this.setDragTimer(movingShapes, INITIAL_POINTER_LAG_DURATION, cb)
		} else if (this.editor.inputs.pointerVelocity.len() > 0.5) {
			clearInterval(this.droppingNodeTimer)
			this.setDragTimer(movingShapes, FAST_POINTER_LAG_DURATION, cb)
		}
	}

	private setDragTimer(movingShapes: TLShape[], duration: number, cb: () => void) {
		this.droppingNodeTimer = setTimeout(() => {
			this.editor.batch(() => {
				this.handleDrag(this.editor.inputs.currentPagePoint, movingShapes, cb)
			})
			this.droppingNodeTimer = null
		}, duration)
	}

	private handleDrag(point: Vec, movingShapes: TLShape[], cb?: () => void) {
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

		this.editor.setHintingShapes(hintingShapes)
	}

	dropShapes(shapes: TLShape[]) {
		const { prevDroppingShapeId } = this

		this.handleDrag(this.editor.inputs.currentPagePoint, shapes)

		if (prevDroppingShapeId) {
			const shape = this.editor.getShape(prevDroppingShapeId)
			if (!shape) return
			this.editor.getShapeUtil(shape).onDropShapesOver?.(shape, shapes)
		}
	}

	clear() {
		this.prevDroppingShapeId = null

		if (this.droppingNodeTimer !== null) {
			clearInterval(this.droppingNodeTimer)
		}

		this.droppingNodeTimer = null
		this.editor.setHintingShapes([])
		this.first = true
	}

	dispose = () => {
		this.clear()
	}
}
