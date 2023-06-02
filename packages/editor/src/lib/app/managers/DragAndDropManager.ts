import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import type { Editor } from '../Editor'

const LAG_DURATION = 100

export class DragAndDropManager {
	constructor(public editor: Editor) {
		editor.disposables.add(this.dispose)
	}

	prevDroppingShapeId: TLShapeId | null = null
	currDroppingShapeId: TLShapeId | null = null

	droppingNodeTimer: ReturnType<typeof setTimeout> | null = null

	updateDroppingNode(movingShapes: TLShape[], cb: () => void) {
		if (this.droppingNodeTimer === null) {
			const { currentPagePoint } = this.editor.inputs
			this.currDroppingShapeId =
				this.editor.getDroppingShape(currentPagePoint, movingShapes)?.id ?? null
			this.setDragTimer(movingShapes, LAG_DURATION * 10, cb)
		} else if (this.editor.inputs.pointerVelocity.len() > 0.5) {
			clearInterval(this.droppingNodeTimer)
			this.setDragTimer(movingShapes, LAG_DURATION, cb)
		}
	}

	private setDragTimer(movingShapes: TLShape[], duration: number, cb: () => void) {
		this.droppingNodeTimer = setTimeout(() => {
			this.editor.batch(() => {
				this.handleDrag(movingShapes, cb)
			})
			this.droppingNodeTimer = null
		}, duration)
	}

	private handleDrag(movingShapes: TLShape[], cb?: () => void) {
		const { currentPagePoint } = this.editor.inputs

		movingShapes = compact(movingShapes.map((shape) => this.editor.getShapeById(shape.id)))

		const currDroppingShapeId =
			this.editor.getDroppingShape(currentPagePoint, movingShapes)?.id ?? null

		if (currDroppingShapeId !== this.currDroppingShapeId) {
			this.prevDroppingShapeId = this.currDroppingShapeId
			this.currDroppingShapeId = currDroppingShapeId
		}

		const { prevDroppingShapeId } = this

		if (currDroppingShapeId === prevDroppingShapeId) {
			// we already called onDragShapesOver on this node, no need to do it again
			return
		}

		const prevDroppingShape = prevDroppingShapeId && this.editor.getShapeById(prevDroppingShapeId)
		const nextDroppingShape = currDroppingShapeId && this.editor.getShapeById(currDroppingShapeId)

		// Even if we don't have a next dropping shape id (i.e. if we're dropping
		// onto the page) set the prev to the current, to avoid repeat calls to
		// the previous parent's onDragShapesOut
		this.prevDroppingShapeId = this.currDroppingShapeId

		if (prevDroppingShape) {
			this.editor.getShapeUtil(prevDroppingShape).onDragShapesOut?.(prevDroppingShape, movingShapes)
		}

		if (nextDroppingShape) {
			const res = this.editor
				.getShapeUtil(nextDroppingShape)
				.onDragShapesOver?.(nextDroppingShape, movingShapes)

			if (res && res.shouldHint) {
				this.editor.setHintingIds([nextDroppingShape.id])
			}
		} else {
			// If we're dropping onto the page, then clear hinting ids
			this.editor.setHintingIds([])
		}

		cb?.()
	}

	dropShapes(shapes: TLShape[]) {
		const { currDroppingShapeId } = this

		this.handleDrag(shapes)

		if (currDroppingShapeId) {
			const shape = this.editor.getShapeById(currDroppingShapeId)
			if (!shape) return
			this.editor.getShapeUtil(shape).onDropShapesOver?.(shape, shapes)
		}
	}

	clear() {
		this.prevDroppingShapeId = null
		this.currDroppingShapeId = null

		if (this.droppingNodeTimer !== null) {
			clearInterval(this.droppingNodeTimer)
		}

		this.droppingNodeTimer = null
		this.editor.setHintingIds([])
	}

	dispose = () => {
		this.clear()
	}
}
