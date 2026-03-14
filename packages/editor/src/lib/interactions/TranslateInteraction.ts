import { isPageId, TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { compact, JsonObject } from '@tldraw/utils'
import type { Editor } from '../editor/Editor'
import { BoundsSnapPoint } from '../editor/managers/SnapManager/BoundsSnaps'
import { Mat, MatModel } from '../primitives/Mat'
import { Vec, VecLike } from '../primitives/Vec'

/** @public */
export interface MovingShapeSnapshot {
	shape: TLShape
	pagePoint: Vec
	pageRotation: number
	parentTransform: MatModel | null
}

/** @public */
export interface TranslatingSnapshot {
	averagePagePoint: Vec
	movingShapes: TLShape[]
	shapeSnapshots: MovingShapeSnapshot[]
	initialPageBounds: import('../primitives/Box').Box
	initialSnapPoints: BoundsSnapPoint[]
}

/** @public */
export interface TranslateInteractionStartOpts {
	shapeIds: TLShapeId[]
}

/**
 * Manages the core translation logic for both interactive (drag) and
 * programmatic (`editor.nudgeShapes()`) use cases.
 *
 * Note: snapping, sticky note adjacency, drag-and-drop, cloning, and
 * edge scrolling remain the responsibility of the state node.
 *
 * @public
 */
export class TranslateInteraction {
	snapshot: TranslatingSnapshot | null = null

	constructor(public editor: Editor) {}

	/**
	 * Capture a snapshot of the shapes to translate and call `onTranslateStart`.
	 * Returns `false` if there are no shapes.
	 */
	start(opts: TranslateInteractionStartOpts): boolean {
		const snapshot = getTranslatingSnapshot(this.editor, opts.shapeIds)
		if (!snapshot || snapshot.movingShapes.length === 0) return false
		this.snapshot = snapshot

		const changes: TLShapePartial[] = []
		snapshot.movingShapes.forEach((shape) => {
			const util = this.editor.getShapeUtil(shape)
			const change = util.onTranslateStart?.(shape)
			if (change) changes.push(change)
		})
		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}

		return true
	}

	/**
	 * Move shapes to match the current pointer position.
	 * Reads delta from `editor.inputs` (origin → current page point).
	 *
	 * Options allow the caller to provide snapping results (computed
	 * externally in the state node where snapping config lives).
	 */
	update(opts?: { snapDelta?: VecLike; flatten?: 'x' | 'y' | null; skipGridSnap?: boolean }): void {
		if (!this.snapshot) return

		const { inputs } = this.editor
		const { shapeSnapshots, averagePagePoint } = this.snapshot

		const delta = Vec.Sub(inputs.getCurrentPagePoint(), inputs.getOriginPagePoint())

		const flatten = opts?.flatten ?? null
		if (flatten === 'x') {
			delta.x = 0
		} else if (flatten === 'y') {
			delta.y = 0
		}

		if (opts?.snapDelta) {
			delta.add(opts.snapDelta)
		}

		const averageSnappedPoint = Vec.Add(averagePagePoint, delta)

		const isGridMode = this.editor.getInstanceState().isGridMode
		const accelKey = this.editor.inputs.getAccelKey()
		const snapIndicators = this.editor.snaps.getIndicators()
		if (isGridMode && !accelKey && !opts?.skipGridSnap && snapIndicators.length === 0) {
			const gridSize = this.editor.getDocumentSettings().gridSize
			averageSnappedPoint.snapToGrid(gridSize)
		}

		const averageSnap = Vec.Sub(averageSnappedPoint, averagePagePoint)

		this.editor.updateShapes(
			compact(
				shapeSnapshots.map(({ shape, pagePoint, parentTransform }): TLShapePartial | null => {
					const newPagePoint = Vec.Add(pagePoint, averageSnap)
					const newLocalPoint = parentTransform
						? Mat.applyToPoint(parentTransform, newPagePoint)
						: newPagePoint

					return {
						id: shape.id,
						type: shape.type,
						x: newLocalPoint.x,
						y: newLocalPoint.y,
					}
				})
			)
		)

		// Fire onTranslate callbacks
		const changes: TLShapePartial[] = []
		this.snapshot.movingShapes.forEach((shape) => {
			const current = this.editor.getShape(shape.id)!
			const util = this.editor.getShapeUtil(shape)
			const change = util.onTranslate?.(shape, current)
			if (change) changes.push(change)
		})
		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}
	}

	/**
	 * Re-capture the snapshot from current selection.
	 * Useful after cloning, where the selected shapes have changed.
	 */
	restart(shapeIds: TLShapeId[]): boolean {
		const snapshot = getTranslatingSnapshot(this.editor, shapeIds)
		if (!snapshot || snapshot.movingShapes.length === 0) return false
		this.snapshot = snapshot

		const changes: TLShapePartial[] = []
		snapshot.movingShapes.forEach((shape) => {
			const util = this.editor.getShapeUtil(shape)
			const change = util.onTranslateStart?.(shape)
			if (change) changes.push(change)
		})
		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}

		return true
	}

	/**
	 * Finalize translation: call `onTranslateEnd` on all shapes.
	 */
	complete(): void {
		if (!this.snapshot) return

		const changes: TLShapePartial[] = []
		this.snapshot.movingShapes.forEach((shape) => {
			const current = this.editor.getShape(shape.id)!
			const util = this.editor.getShapeUtil(shape)
			const change = util.onTranslateEnd?.(shape, current)
			if (change) changes.push(change)
		})
		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}

		this.snapshot = null
	}

	/**
	 * Cancel translation: call `onTranslateCancel` on all shapes.
	 * The caller is responsible for bailing to a mark.
	 */
	cancel(): void {
		if (!this.snapshot) return

		this.snapshot.movingShapes.forEach((shape) => {
			const current = this.editor.getShape(shape.id)
			if (current) {
				const util = this.editor.getShapeUtil(shape)
				util.onTranslateCancel?.(shape, current)
			}
		})

		this.snapshot = null
	}

	/**
	 * Update parent transforms for nested shapes (e.g. after drag-and-drop reparenting).
	 */
	updateParentTransforms(): void {
		if (!this.snapshot) return

		this.snapshot.shapeSnapshots.forEach((shapeSnapshot) => {
			const shape = this.editor.getShape(shapeSnapshot.shape.id)
			if (!shape) return
			shapeSnapshot.parentTransform = isPageId(shape.parentId)
				? null
				: Mat.Inverse(this.editor.getShapePageTransform(shape.parentId)!)
		})
	}

	/**
	 * Perform a one-off translation: translate shapes by an offset without
	 * interactive snapping. Used by `editor.nudgeShapes()`.
	 */
	static translateOneOff(editor: Editor, ids: TLShapeId[], offset: VecLike): void {
		if (ids.length <= 0) return
		const changes: TLShapePartial[] = []

		for (const id of ids) {
			const shape = editor.getShape(id)!
			const localDelta = Vec.From(offset)
			const parentTransform = editor.getShapeParentTransform(shape)
			if (parentTransform) localDelta.rot(-parentTransform.rotation())

			let workingShape = shape
			const util = editor.getShapeUtil(shape)

			const afterTranslateStart = util.onTranslateStart?.(workingShape)
			if (afterTranslateStart) {
				workingShape = applyPartialToShape(workingShape, afterTranslateStart)
			}

			const newCoords = localDelta.add(shape)
			workingShape = { ...workingShape, x: newCoords.x, y: newCoords.y }

			const afterTranslate = util.onTranslate?.(shape, workingShape)
			if (afterTranslate) {
				workingShape = applyPartialToShape(workingShape, afterTranslate)
			}

			const afterTranslateEnd = util.onTranslateEnd?.(shape, workingShape)
			if (afterTranslateEnd) {
				workingShape = applyPartialToShape(workingShape, afterTranslateEnd)
			}

			changes.push(workingShape)
		}

		editor.updateShapes(changes)
	}
}

/** @internal */
export function getTranslatingSnapshot(
	editor: Editor,
	shapeIds: TLShapeId[]
): TranslatingSnapshot | null {
	const movingShapes: TLShape[] = []
	const pagePoints: Vec[] = []

	const shapeSnapshots = compact(
		shapeIds.map((id): null | MovingShapeSnapshot => {
			const shape = editor.getShape(id)
			if (!shape) return null
			movingShapes.push(shape)

			const pageTransform = editor.getShapePageTransform(id)
			const pagePoint = pageTransform.point()
			const pageRotation = pageTransform.rotation()

			pagePoints.push(pagePoint)

			const parentTransform = isPageId(shape.parentId)
				? null
				: Mat.Inverse(editor.getShapePageTransform(shape.parentId)!)

			return {
				shape,
				pagePoint,
				pageRotation,
				parentTransform,
			}
		})
	)

	if (movingShapes.length === 0) return null

	const onlySelectedShape = shapeIds.length === 1 ? editor.getShape(shapeIds[0]) : undefined

	let initialSnapPoints: BoundsSnapPoint[] = []

	if (onlySelectedShape) {
		initialSnapPoints = editor.snaps.shapeBounds.getSnapPoints(onlySelectedShape.id)!
	} else {
		const selectionPageBounds = editor.getSelectionPageBounds()
		if (selectionPageBounds) {
			initialSnapPoints = selectionPageBounds.cornersAndCenter.map((p, i) => ({
				id: 'selection:' + i,
				x: p.x,
				y: p.y,
			}))
		}
	}

	return {
		averagePagePoint: Vec.Average(pagePoints),
		movingShapes,
		shapeSnapshots,
		initialPageBounds: editor.getSelectionPageBounds()!,
		initialSnapPoints,
	}
}

/** Merge a shape partial into a shape, doing a shallow merge for `props` and `meta`. */
function applyPartialToShape(shape: TLShape, partial: TLShapePartial): TLShape {
	const result = { ...shape } as any
	for (const [k, v] of Object.entries(partial)) {
		if (v === undefined) continue
		if (k === 'id' || k === 'type' || k === 'typeName') continue
		if (k === 'props' || k === 'meta') {
			result[k] = { ...shape[k as 'props' | 'meta'], ...(v as JsonObject) }
		} else {
			result[k] = v
		}
	}
	return result
}
