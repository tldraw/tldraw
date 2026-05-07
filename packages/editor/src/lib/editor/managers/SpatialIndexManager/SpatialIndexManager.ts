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
 * Handles shapes with computed bounds (arrows, groups, custom shapes) by re-checking
 * indexed shapes' bounds on every incremental update.
 *
 * Key features:
 * - Incremental updates using filterHistory pattern
 * - Exposes a `_boundsEpoch` that ticks only when the rbush actually changes,
 *   so downstream computeds (e.g. notVisibleShapes) can skip work on prop-only
 *   shape changes that don't move any bounds
 * - Step-1 upserts compare against the indexed bounds and skip rbush mutation
 *   when bounds are unchanged, so prop-only updates are cheap
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

	// Increments only when the rbush actually changes (a bounds was added,
	// removed, or moved). Consumers downstream (e.g. notVisibleShapes) depend on
	// this value rather than the store epoch, so they don't re-run when shape
	// props change without affecting bounds.
	private _boundsEpoch = 0

	constructor(public readonly editor: Editor) {
		this.rbush = new RBushIndex()
		this.spatialIndexComputed = this.createSpatialIndexComputed()
	}

	private createSpatialIndexComputed() {
		const shapeHistory = this.editor.store.query.filterHistory('shape')

		return computed<number>('spatialIndex', (_prevValue, lastComputedEpoch) => {
			if (isUninitialized(_prevValue)) {
				this.buildFromScratch()
				this._boundsEpoch++
				return this._boundsEpoch
			}

			const shapeDiff = shapeHistory.getDiffSince(lastComputedEpoch)

			if (shapeDiff === RESET_VALUE) {
				this.buildFromScratch()
				this._boundsEpoch++
				return this._boundsEpoch
			}

			const currentPageId = this.editor.getCurrentPageId()
			if (this.lastPageId !== currentPageId) {
				this.buildFromScratch()
				this._boundsEpoch++
				return this._boundsEpoch
			}

			// No shape changes - index is already up to date
			if (shapeDiff.length === 0) {
				return this._boundsEpoch
			}

			// Process incremental updates; only bump the epoch when something
			// actually changed in the rbush. This is what lets downstream
			// computeds (notVisibleShapes etc.) skip work on prop-only changes.
			if (this.processIncrementalUpdate(shapeDiff)) {
				this._boundsEpoch++
			}
			return this._boundsEpoch
		})
	}

	private buildFromScratch(): void {
		this.rbush.clear()
		this.lastPageId = this.editor.getCurrentPageId()

		const shapes = this.editor.getCurrentPageShapes()
		const elements: SpatialElement[] = []

		// Collect all shape elements for bulk loading
		for (const shape of shapes) {
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
		// Track shapes we've already processed from the diff
		const processedShapeIds = new Set<TLShapeId>()
		let changed = false

		// 1. Process shape additions, removals, and updates from diff
		for (const changes of shapeDiff) {
			// Handle additions (only for shapes on current page)
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

			// Handle removals. Only mark changed when the shape was actually in
			// the rbush — removed shapes from other pages, or shapes that were
			// never indexed (invalid bounds at insert time), are no-ops here
			// and shouldn't bump the bounds epoch.
			for (const shape of objectMapValues(changes.removed) as TLShape[]) {
				if (isShape(shape)) {
					if (this.rbush.getBounds(shape.id) !== undefined) {
						this.rbush.remove(shape.id)
						changed = true
					}
					processedShapeIds.add(shape.id)
				}
			}

			// Handle updated shapes: page changes and bounds updates. Only
			// upsert when the bounds actually differ — a shape's props can
			// change without affecting its bounds (e.g., an active draw stroke
			// adding a point that lies within the existing bounding box).
			for (const [, to] of objectMapValues(changes.updated) as [TLShape, TLShape][]) {
				if (!isShape(to)) continue
				processedShapeIds.add(to.id)

				const isOnPage = this.editor.getAncestorPageId(to) === this.lastPageId

				if (isOnPage) {
					const bounds = this.editor.getShapePageBounds(to.id)
					if (bounds && bounds.isValid()) {
						const indexedBounds = this.rbush.getBounds(to.id)
						if (!this.areBoundsEqual(bounds, indexedBounds)) {
							this.rbush.upsert(to.id, bounds)
							changed = true
						}
					} else if (this.rbush.getBounds(to.id) !== undefined) {
						this.rbush.remove(to.id)
						changed = true
					}
				} else if (this.rbush.getBounds(to.id) !== undefined) {
					this.rbush.remove(to.id)
					changed = true
				}
			}
		}

		// 2. Check remaining indexed shapes for bounds changes. This handles
		// shapes whose bounds derive from other shapes (arrows bound to moved
		// shapes, groups with moved children) — and importantly also catches
		// cases where a shape's *outline* changed without its axis-aligned
		// bounds changing (e.g. geo `rectangle` → `ellipse` at the same w/h),
		// which can shift a bound arrow's intersection points and therefore
		// its bounds. A diff with only such updates leaves `changed` false
		// after step 1, so we can't skip this pass on that signal alone.
		const allShapeIds = this.rbush.getAllShapeIds()

		for (const shapeId of allShapeIds) {
			if (processedShapeIds.has(shapeId)) continue

			const currentBounds = this.editor.getShapePageBounds(shapeId)
			const indexedBounds = this.rbush.getBounds(shapeId)

			if (!this.areBoundsEqual(currentBounds, indexedBounds)) {
				if (currentBounds && currentBounds.isValid()) {
					this.rbush.upsert(shapeId, currentBounds)
				} else {
					this.rbush.remove(shapeId)
				}
				changed = true
			}
		}

		return changed
	}

	private areBoundsEqual(a: Box | undefined, b: Box | undefined): boolean {
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
