import { Editor, TLShape, TLShapeId, Vec, compact } from '@tldraw/editor'

const LAG_DURATION = 100

/** @public */
export class DragAndDropManager {
	constructor(public editor: Editor) {
		editor.addListener('tick', this.updateOnTick)
		editor.disposables.add(this.dispose)
	}

	droppingNodeTimer = null as null | { remaining: number; cb: () => void }

	prevDroppingShapeId: TLShapeId | null = null

	first = true

	updateDroppingNode(movingShapes: TLShape[], cb: () => void) {
		if (this.first) {
			this.prevDroppingShapeId =
				this.editor.getDroppingOverShape(this.editor.inputs.originPagePoint, movingShapes)?.id ??
				null
			this.first = false
		}

		if (this.droppingNodeTimer === null) {
			this.setTimer(movingShapes, LAG_DURATION * 10, cb)
		} else if (this.editor.inputs.pointerVelocity.len() > 0.5) {
			this.setTimer(movingShapes, LAG_DURATION, cb)
		}
	}

	updateOnTick = (elapsed: number) => {
		if (this.droppingNodeTimer === null) return

		this.droppingNodeTimer.remaining -= elapsed
		if (this.droppingNodeTimer.remaining < 0) {
			this.droppingNodeTimer.cb()
			this.droppingNodeTimer = null
		}
	}

	private setTimer(movingShapes: TLShape[], duration: number, cb: () => void) {
		this.droppingNodeTimer = {
			cb: () => {
				this.handleDrag(this.editor.inputs.currentPagePoint, movingShapes, cb)
			},
			remaining: duration,
		}
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
			this.editor.getShapeUtil(prevDroppingShape).onDragShapesOut?.(prevDroppingShape, movingShapes)
		}

		if (nextDroppingShape) {
			const res = this.editor
				.getShapeUtil(nextDroppingShape)
				.onDragShapesOver?.(nextDroppingShape, movingShapes)

			if (res && res.shouldHint) {
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
			this.editor.getShapeUtil(shape).onDropShapesOver?.(shape, shapes)
		}
	}

	clear() {
		this.prevDroppingShapeId = null
		this.editor.setHintingShapes([])
		this.first = true
	}

	dispose = () => {
		this.editor.removeListener('tick', this.updateOnTick)
		this.clear()
	}
}
