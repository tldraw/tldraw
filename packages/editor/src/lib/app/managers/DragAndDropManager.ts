import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import type { Editor } from '../Editor'

const LAG_DURATION = 100

export class DragAndDropManager {
	constructor(public app: Editor) {
		app.disposables.add(this.dispose)
	}

	prevDroppingShapeId: TLShapeId | null = null
	currDroppingShapeId: TLShapeId | null = null

	droppingNodeTimer: ReturnType<typeof setTimeout> | null = null

	updateDroppingNode(movingShapes: TLShape[], cb: () => void) {
		if (this.droppingNodeTimer === null) {
			const { currentPagePoint } = this.app.inputs
			this.currDroppingShapeId =
				this.app.getDroppingShape(currentPagePoint, movingShapes)?.id ?? null
			this.setDragTimer(movingShapes, LAG_DURATION * 10, cb)
		} else if (this.app.inputs.pointerVelocity.len() > 0.5) {
			clearInterval(this.droppingNodeTimer)
			this.setDragTimer(movingShapes, LAG_DURATION, cb)
		}
	}

	private setDragTimer(movingShapes: TLShape[], duration: number, cb: () => void) {
		this.droppingNodeTimer = setTimeout(() => {
			this.app.batch(() => {
				this.handleDrag(movingShapes, cb)
			})
			this.droppingNodeTimer = null
		}, duration)
	}

	private handleDrag(movingShapes: TLShape[], cb?: () => void) {
		const { currentPagePoint } = this.app.inputs

		movingShapes = compact(movingShapes.map((shape) => this.app.getShapeById(shape.id)))

		const currDroppingShapeId =
			this.app.getDroppingShape(currentPagePoint, movingShapes)?.id ?? null

		if (currDroppingShapeId !== this.currDroppingShapeId) {
			this.prevDroppingShapeId = this.currDroppingShapeId
			this.currDroppingShapeId = currDroppingShapeId
		}

		const { prevDroppingShapeId } = this

		if (currDroppingShapeId === prevDroppingShapeId) {
			// we already called onDragShapesOver on this node, no need to do it again
			return
		}

		const prevDroppingShape = prevDroppingShapeId && this.app.getShapeById(prevDroppingShapeId)
		const nextDroppingShape = currDroppingShapeId && this.app.getShapeById(currDroppingShapeId)

		// Even if we don't have a next dropping shape id (i.e. if we're dropping
		// onto the page) set the prev to the current, to avoid repeat calls to
		// the previous parent's onDragShapesOut
		this.prevDroppingShapeId = this.currDroppingShapeId

		if (prevDroppingShape) {
			this.app.getShapeUtil(prevDroppingShape).onDragShapesOut?.(prevDroppingShape, movingShapes)
		}

		if (nextDroppingShape) {
			const res = this.app
				.getShapeUtil(nextDroppingShape)
				.onDragShapesOver?.(nextDroppingShape, movingShapes)

			if (res && res.shouldHint) {
				this.app.setHintingIds([nextDroppingShape.id])
			}
		} else {
			// If we're dropping onto the page, then clear hinting ids
			this.app.setHintingIds([])
		}

		cb?.()
	}

	dropShapes(shapes: TLShape[]) {
		const { currDroppingShapeId } = this

		this.handleDrag(shapes)

		if (currDroppingShapeId) {
			const shape = this.app.getShapeById(currDroppingShapeId)
			if (!shape) return
			this.app.getShapeUtil(shape).onDropShapesOver?.(shape, shapes)
		}
	}

	clear() {
		this.prevDroppingShapeId = null
		this.currDroppingShapeId = null

		if (this.droppingNodeTimer !== null) {
			clearInterval(this.droppingNodeTimer)
		}

		this.droppingNodeTimer = null
		this.app.setHintingIds([])
	}

	dispose = () => {
		this.clear()
	}
}
