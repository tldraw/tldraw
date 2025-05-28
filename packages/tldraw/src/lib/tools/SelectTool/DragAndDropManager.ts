import {
	Editor,
	TLFrameShape,
	TLParentId,
	TLShape,
	TLShapeId,
	Vec,
	bind,
	compact,
	intersectPolygonPolygon,
	isShapeId,
} from '@tldraw/editor'
import { doesGeometryOverlapPolygon, getHasOverlappingShapes } from './selectHelpers'

const SLOW_POINTER_LAG_DURATION = 320
const FAST_POINTER_LAG_DURATION = 60

/** @public */
export class DragAndDropManager {
	constructor(public editor: Editor) {
		editor.disposables.add(this.dispose)
	}

	initialParentids = new Map<TLShapeId, TLParentId>()

	initialGroupId = new Map<TLShapeId, TLShapeId>()

	prevDroppingShape?: TLShape

	timerId?: any

	first = true

	private onDragStart(movingShapes: TLShape[]) {
		this.clear()

		this.prevDroppingShape = this.editor.getDroppingOverShape(
			this.editor.inputs.originPagePoint,
			movingShapes
		)

		movingShapes.forEach((s) => {
			const groupId = this.editor.findShapeAncestor(s, (s) => s.type === 'group')
			if (groupId) {
				this.initialGroupId.set(s.id, groupId.id)
			}
		})

		this.initialParentids = new Map(
			movingShapes.map((s) => {
				return [s.id, s.parentId] as const
			})
		)
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
		this.handleDrag(this.editor.inputs.currentPagePoint, movingShapes, cb)

		// then once on an interval, skipping frames if moving quickly
		let skip2of3FramesWhileMovingFast = 0
		this.timerId = this.editor.timers.setInterval(
			() => {
				skip2of3FramesWhileMovingFast++
				if (skip2of3FramesWhileMovingFast % 3 && this.editor.inputs.pointerVelocity.len() > 0.5)
					return
				this.handleDrag(this.editor.inputs.currentPagePoint, movingShapes, cb)
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

	private findDroppingShape(
		shape: TLShape | undefined,
		movingShapes: TLShape[]
	): TLShape | undefined {
		if (!shape) return
		if (shape.isLocked) return

		if (getHasOverlappingShapes(this.editor, shape, movingShapes)) {
			return shape
		}

		const parent = this.editor.getShapeParent(shape)
		if (!parent) return

		return this.findDroppingShape(parent, movingShapes)
	}

	private handleDrag(point: Vec, movingShapes: TLShape[], cb?: () => void) {
		const { editor } = this

		// the old previous one
		const prevDroppingShape = this.prevDroppingShape && this.editor.getShape(this.prevDroppingShape)

		// get fresh moving shapes
		movingShapes = compact(movingShapes.map((s) => editor.getShape(s)))

		// Get the next dropping shape under the pointer, if any
		const nextDroppingShape = this.findDroppingShape(
			this.editor.getDroppingOverShape(point, movingShapes),
			movingShapes
		)

		// is the next dropping shape id is present and its the same as last time, we can skip work?
		if (nextDroppingShape?.id && nextDroppingShape.id === prevDroppingShape?.id) {
			return
		}

		// The next dropping id is either not present or is different than last time
		// Either way, if we have a previous dropping shape, drop those shapes out
		if (prevDroppingShape) {
			this.editor.getShapeUtil(prevDroppingShape).onDragShapesOut?.(prevDroppingShape, movingShapes)
		}

		// If we have a next dropping shape, call the onDragShapesOver method
		// and set the prevDroppingShape to the next one
		if (nextDroppingShape) {
			const droppingGroupId = this.editor.findShapeAncestor(
				nextDroppingShape,
				(s) => s.type === 'group'
			)?.id
			const okShapesToMove = movingShapes.filter(
				(s) => this.initialGroupId.get(s.id) === droppingGroupId
			)

			if (okShapesToMove.length > 0) {
				this.editor
					.getShapeUtil(nextDroppingShape)
					.onDragShapesOver?.(nextDroppingShape, okShapesToMove)
				this.prevDroppingShape = nextDroppingShape
			}
		} else {
			// Otherwise, we have no next dropping shape under the cursor, so go find
			// all the frames on the page where the moving shapes will fall into
			const { editor } = this

			const remainingShapesToReparent = new Set(movingShapes)

			const potentialParentFrames = this.editor
				.getCurrentPageShapesSorted()
				.filter(
					(s) =>
						this.editor.isShapeOfType<TLFrameShape>(s, 'frame') && !remainingShapesToReparent.has(s)
				)

			const reparenting = new Map<TLShapeId, TLShape[]>()

			for (let i = potentialParentFrames.length - 1; i >= 0; i--) {
				const frame = potentialParentFrames[i]

				// Frame geometry in page space
				const frameGeometry = editor.getShapeGeometry(frame)
				const framePageTransform = editor.getShapePageTransform(frame)

				const framePageMaskVertices = editor.getShapePageMask(frame)
				const framePageCorners = framePageTransform.applyToPoints(frameGeometry.vertices)
				const framePagePolygon = framePageMaskVertices
					? intersectPolygonPolygon(framePageMaskVertices, framePageCorners)
					: framePageCorners

				if (!framePagePolygon) continue

				const frameGroupId = this.editor.findShapeAncestor(frame, (s) => s.type === 'group')?.id

				const childrenToReparent = []

				// For each of the dropping shapes...
				for (const shape of remainingShapesToReparent) {
					// Don't reparent a frame to itself
					if (frame.id === shape.id) continue

					// If the two shapes are part of different groups, skip
					if (this.initialGroupId.get(shape.id) !== frameGroupId) continue

					const parentPolygonInShapeSpace = editor
						.getShapePageTransform(shape)
						.clone()
						.invert()
						.applyToPoints(framePagePolygon)

					const geometry = editor.getShapeGeometry(shape)
					if (doesGeometryOverlapPolygon(geometry, parentPolygonInShapeSpace)) {
						// If the shape overlaps the frame, reparent it to that frame
						childrenToReparent.push(shape)
						remainingShapesToReparent.delete(shape)
						continue
					}
				}

				reparenting.set(frame.id, childrenToReparent)
			}

			editor.run(() => {
				reparenting.forEach((childrenToReparent, frameId) => {
					if (childrenToReparent.length === 0) return
					editor.reparentShapes(childrenToReparent, frameId)
				})

				// Reparent the rest to the page (or containing group)
				if (remainingShapesToReparent.size > 0) {
					remainingShapesToReparent.forEach((shape) => {
						// sometimes a group can disappear while dragging;
						// annoyingly, this can happen if a frame and a shape are grouped and you move the shape into the frame; the group will be lost forever
						let initialGroupParent = this.initialGroupId.get(shape.id) as TLShapeId | undefined
						if (initialGroupParent && !this.editor.getShape(initialGroupParent)) {
							const next = this.editor.findShapeAncestor(shape, (s) => s.type === 'group')?.id
							if (next) {
								initialGroupParent = next
								this.initialGroupId.set(shape.id, next)
							} else {
								initialGroupParent = undefined
								this.initialGroupId.delete(shape.id)
							}
						}

						if (initialGroupParent) {
							editor.reparentShapes([shape], initialGroupParent)
						} else {
							editor.reparentShapes([shape], editor.getCurrentPageId())
						}
					})
				}
			})

			this.prevDroppingShape = undefined
		}

		const hintingShapeIds = new Set<TLShapeId>()

		for (const shape of movingShapes) {
			// Fresh parent id
			const parentId = this.editor.getShape(shape)?.parentId
			const initialParentId = this.initialParentids.get(shape.id)

			// If the parent id has changed, then unset the initial parent id
			if (parentId !== initialParentId) {
				this.initialParentids.delete(shape.id)
			}

			// If the new parent id is a shape and if it is different from the initial parent id, the hint it
			if (isShapeId(parentId) && parentId !== initialParentId) {
				hintingShapeIds.add(parentId)
			}
		}

		this.editor.setHintingShapes([...hintingShapeIds])

		cb?.()
	}

	dropShapes(shapes: TLShape[]) {
		this.handleDrag(this.editor.inputs.currentPagePoint, shapes)
		const prevDroppingShape = this.prevDroppingShape && this.editor.getShape(this.prevDroppingShape)
		if (!prevDroppingShape) return
		this.editor.getShapeUtil(prevDroppingShape).onDropShapesOver?.(prevDroppingShape, shapes)
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
}
