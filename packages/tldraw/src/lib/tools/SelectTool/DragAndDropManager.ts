import { Editor, TLGroupShape, TLShape, TLShapeId, Vec, compact } from '@tldraw/editor'

const LAG_DURATION = 100

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
			this.prevDroppingShapeId =
				this.editor.getDroppingOverShape(this.editor.inputs.originPagePoint, movingShapes)?.id ??
				null
			this.first = false
		}

		if (this.droppingNodeTimer === null) {
			this.setDragTimer(movingShapes, LAG_DURATION * 10, cb)
		} else if (this.editor.inputs.pointerVelocity.len() > 0.5) {
			clearInterval(this.droppingNodeTimer)
			this.setDragTimer(movingShapes, LAG_DURATION, cb)
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
			const parent = this.editor.getShape(prevDroppingShape.parentId)
			const isInGroup = parent && this.editor.isShapeOfType<TLGroupShape>(parent, 'group')

			// If frame is in a group, keep the shape
			// moved out in that group

			if (isInGroup) {
				this.editor.reparentShapes(movingShapes, parent.id)
			} else {
				this.editor.reparentShapes(movingShapes, this.editor.getCurrentPageId())
			}
		}

		if (nextDroppingShape) {
			if (!movingShapes.every((child) => child.parentId === nextDroppingShape.id)) {
				this.editor.reparentShapes(movingShapes, nextDroppingShape.id)
				this.editor.setHintingShapes([nextDroppingShape.id])
			}
		} else {
			// If we're dropping onto the page, then clear hinting ids
			this.editor.setHintingShapes([])
		}

		cb?.()

		// next -> curr
		this.prevDroppingShapeId = nextDroppingShapeId
	}

	dropShapes(shapes: TLShape[]) {
		const { prevDroppingShapeId } = this

		this.handleDrag(this.editor.inputs.currentPagePoint, shapes)

		if (prevDroppingShapeId) {
			const shape = this.editor.getShape(prevDroppingShapeId)
			if (!shape) return
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
