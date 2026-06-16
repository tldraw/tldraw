import { Computed, RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import type { RecordsDiff } from '@tldraw/store'
import { TLPageId, TLShape, TLShapeId, isShape } from '@tldraw/tlschema'
import type { TLRecord } from '@tldraw/tlschema'
import { objectMapValues } from '@tldraw/utils'
import { Box } from '../../../primitives/Box'
import type { Editor } from '../../Editor'
import { RBushIndex, type SpatialElement } from './RBushIndex'

/**
 * Manages spatial indexing for efficient shape location queries.
 *
 * Uses an R-tree (via RBush) to enable O(log n) spatial queries instead of O(n) iteration.
 * Handles shapes with computed bounds (arrows, groups, custom shapes) by checking all shapes'
 * bounds on each update using the reactive bounds cache.
 *
 * Key features:
 * - Incremental updates using filterHistory pattern
 * - Leverages existing bounds cache reactivity for dependency tracking
 * - Works with any custom shape type with computed bounds
 * - Per-page index (rebuilds on page change)
 * - Optimized for viewport culling queries
 *
 * @internal
 */
export class SpatialIndexManager {
	private rbush: RBushIndex
	private spatialIndexComputed: Computed<number>
	private lastPageId: TLPageId | null = null

	// Bumps only when the rbush content may have changed. Consumers subscribe
	// via the computed; a stable epoch lets prop-only diffs skip downstream
	// invalidations.
	private _boundsEpoch = 0

	constructor(public readonly editor: Editor) {
		this.rbush = new RBushIndex()
		this.spatialIndexComputed = this.createSpatialIndexComputed()
	}

	private rebuildAndBumpEpoch(): number {
		this.buildFromScratch()
		this._boundsEpoch++
		return this._boundsEpoch
	}

	private createSpatialIndexComputed() {
		const shapeHistory = this.editor.store.query.filterHistory('shape')
		// Binding changes can move a shape's derived bounds (e.g. creating or
		// deleting an arrow binding relocates the arrow's body) without
		// touching any shape record, so they must also invalidate the index.
		const bindingHistory = this.editor.store.query.filterHistory('binding')

		return computed<number>('spatialIndex', (_prevValue, lastComputedEpoch) => {
			if (isUninitialized(_prevValue)) {
				return this.rebuildAndBumpEpoch()
			}

			const shapeDiff = shapeHistory.getDiffSince(lastComputedEpoch)
			const bindingDiff = bindingHistory.getDiffSince(lastComputedEpoch)

			if (shapeDiff === RESET_VALUE || bindingDiff === RESET_VALUE) {
				return this.rebuildAndBumpEpoch()
			}

			const currentPageId = this.editor.getCurrentPageId()
			if (this.lastPageId !== currentPageId) {
				return this.rebuildAndBumpEpoch()
			}

			if (shapeDiff.length === 0 && bindingDiff.length === 0) return this._boundsEpoch

			// A binding-only diff passes an empty shape diff: step 1 is a no-op
			// and the step-2 sweep re-checks the indexed bounds of every shape.
			if (this.processIncrementalUpdate(shapeDiff)) {
				this._boundsEpoch++
			}
			return this._boundsEpoch
		})
	}

	private buildFromScratch(): void {
		this.rbush.clear()
		this.lastPageId = this.editor.getCurrentPageId()

		const elements: SpatialElement[] = []
		for (const shape of this.editor.getCurrentPageShapes()) {
			const bounds = this.editor.getShapePageBounds(shape.id)
			if (bounds && bounds.isValid()) {
				elements.push({
					minX: bounds.minX,
					minY: bounds.minY,
					maxX: bounds.maxX,
					maxY: bounds.maxY,
					id: shape.id,
				})
			}
		}

		// Bulk load for efficiency
		this.rbush.bulkLoad(elements)
	}

	private processIncrementalUpdate(shapeDiff: RecordsDiff<TLRecord>[]): boolean {
		const processedShapeIds = new Set<TLShapeId>()
		let changed = false

		// Step 1: apply diff entries directly. `changed` flips only on real
		// rbush mutations, so prop-only updates and no-op removes (e.g. shapes
		// from other pages, or never-indexed shapes with invalid bounds) don't
		// bump the epoch.
		for (const changes of shapeDiff) {
			for (const shape of objectMapValues(changes.added) as TLShape[]) {
				if (isShape(shape) && this.editor.getAncestorPageId(shape) === this.lastPageId) {
					const bounds = this.editor.getShapePageBounds(shape.id)
					if (bounds && bounds.isValid()) {
						this.rbush.upsert(shape.id, bounds)
						changed = true
					}
					processedShapeIds.add(shape.id)
				}
			}

			for (const shape of objectMapValues(changes.removed) as TLShape[]) {
				if (isShape(shape)) {
					if (this.rbush.has(shape.id)) {
						this.rbush.remove(shape.id)
						changed = true
					}
					processedShapeIds.add(shape.id)
				}
			}

			for (const [, to] of objectMapValues(changes.updated) as [TLShape, TLShape][]) {
				if (!isShape(to)) continue
				processedShapeIds.add(to.id)

				const isOnPage = this.editor.getAncestorPageId(to) === this.lastPageId

				if (isOnPage) {
					const bounds = this.editor.getShapePageBounds(to.id)
					if (bounds && bounds.isValid()) {
						const indexedElement = this.rbush.getElement(to.id)
						if (!this.areBoundsEqualToSpatialElement(bounds, indexedElement)) {
							this.rbush.upsert(to.id, bounds)
							changed = true
						}
					} else if (this.rbush.has(to.id)) {
						this.rbush.remove(to.id)
						changed = true
					}
				} else if (this.rbush.has(to.id)) {
					this.rbush.remove(to.id)
					changed = true
				}
			}
		}

		// Step 2: must always run. Diff entries can dirty derived bounds —
		// arrows bound to moved shapes, groups with moved children — without
		// touching any record visited in step 1. Also catches outline-only
		// changes (e.g. geo rectangle→ellipse at the same w/h) that shift a
		// bound arrow's intersection points: step 1 sees the geo's
		// axis-aligned bounds unchanged and skips, but the dependent arrow's
		// bounds have moved.
		//
		// Iterating the rbush's element map directly avoids allocating a
		// shape-id array per pointer move. Mutation here is limited to
		// upserts of existing keys and deletions, both safe during Map
		// iteration.
		for (const [shapeId, indexedElement] of this.rbush.entries()) {
			if (processedShapeIds.has(shapeId)) continue

			const currentBounds = this.editor.getShapePageBounds(shapeId)
			if (this.areBoundsEqualToSpatialElement(currentBounds, indexedElement)) continue

			if (currentBounds && currentBounds.isValid()) {
				this.rbush.upsert(shapeId, currentBounds)
			} else {
				this.rbush.remove(shapeId)
			}
			changed = true
		}

		return changed
	}

	private areBoundsEqualToSpatialElement(
		a: Box | undefined,
		b: SpatialElement | undefined
	): boolean {
		if (!a && !b) return true
		if (!a || !b) return false
		return a.minX === b.minX && a.minY === b.minY && a.maxX === b.maxX && a.maxY === b.maxY
	}

	/**
	 * Get shape IDs within the given bounds.
	 * Optimized for viewport culling queries.
	 *
	 * Note: Results are unordered. If you need z-order, combine with sorted shapes:
	 * ```ts
	 * const candidates = editor.spatialIndex.getShapeIdsInsideBounds(bounds)
	 * const sorted = editor.getCurrentPageShapesSorted().filter(s => candidates.has(s.id))
	 * ```
	 *
	 * @param bounds - The bounds to search within
	 * @returns Unordered set of shape IDs within the bounds
	 *
	 * @public
	 */
	getShapeIdsInsideBounds(bounds: Box): Set<TLShapeId> {
		this.spatialIndexComputed.get()
		return this.rbush.search(bounds)
	}

	/**
	 * Get shape IDs at a point (with optional margin).
	 * Creates a small bounding box around the point and searches the spatial index.
	 *
	 * Note: Results are unordered. If you need z-order, combine with sorted shapes:
	 * ```ts
	 * const candidates = editor.spatialIndex.getShapeIdsAtPoint(point, margin)
	 * const sorted = editor.getCurrentPageShapesSorted().filter(s => candidates.has(s.id))
	 * ```
	 *
	 * @param point - The point to search at
	 * @param margin - The margin around the point to search (default: 0)
	 * @returns Unordered set of shape IDs that could potentially contain the point
	 *
	 * @public
	 */
	getShapeIdsAtPoint(point: { x: number; y: number }, margin = 0): Set<TLShapeId> {
		this.spatialIndexComputed.get()
		return this.rbush.search(new Box(point.x - margin, point.y - margin, margin * 2, margin * 2))
	}

	/**
	 * Dispose of the spatial index manager.
	 * Clears the R-tree to prevent memory leaks.
	 *
	 * @public
	 */
	dispose(): void {
		this.rbush.dispose()
		this.lastPageId = null
	}
}
