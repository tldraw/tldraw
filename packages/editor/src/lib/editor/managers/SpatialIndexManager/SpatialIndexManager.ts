import { Computed, RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import type { RecordsDiff } from '@tldraw/store'
import type { TLRecord } from '@tldraw/tlschema'
import { TLPageId, TLShape, TLShapeId, isShape } from '@tldraw/tlschema'
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

	constructor(public readonly editor: Editor) {
		this.rbush = new RBushIndex()
		this.spatialIndexComputed = this.createSpatialIndexComputed()
	}

	private createSpatialIndexComputed() {
		const shapeHistory = this.editor.store.query.filterHistory('shape')

		return computed<number>('spatialIndex', (_prevValue, lastComputedEpoch) => {
			if (isUninitialized(_prevValue)) {
				return this.buildFromScratch(lastComputedEpoch)
			}

			const shapeDiff = shapeHistory.getDiffSince(lastComputedEpoch)

			if (shapeDiff === RESET_VALUE) {
				return this.buildFromScratch(lastComputedEpoch)
			}

			const currentPageId = this.editor.getCurrentPageId()
			if (this.lastPageId !== currentPageId) {
				return this.buildFromScratch(lastComputedEpoch)
			}

			// No shape changes - index is already up to date
			if (shapeDiff.length === 0) {
				return lastComputedEpoch
			}

			// Process incremental updates
			this.processIncrementalUpdate(shapeDiff)

			return lastComputedEpoch
		})
	}

	private buildFromScratch(epoch: number): number {
		this.rbush.clear()
		this.lastPageId = this.editor.getCurrentPageId()

		const shapes = this.editor.getCurrentPageShapes()
		const elements: SpatialElement[] = []

		// Collect all shape elements for bulk loading
		for (const shape of shapes) {
			const bounds = this.editor.getShapePageBounds(shape.id)
			if (bounds) {
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

		return epoch
	}

	private processIncrementalUpdate(shapeDiff: RecordsDiff<TLRecord>[]): void {
		// Track shapes we've already processed from the diff
		const processedShapeIds = new Set<TLShapeId>()

		// 1. Process shape additions, removals, and updates from diff
		for (const changes of shapeDiff) {
			// Handle additions (only for shapes on current page)
			for (const shape of objectMapValues(changes.added) as TLShape[]) {
				if (isShape(shape) && this.editor.getAncestorPageId(shape) === this.lastPageId) {
					const bounds = this.editor.getShapePageBounds(shape.id)
					if (bounds) {
						this.rbush.upsert(shape.id, bounds)
					}
					processedShapeIds.add(shape.id)
				}
			}

			// Handle removals
			for (const shape of objectMapValues(changes.removed) as TLShape[]) {
				if (isShape(shape)) {
					this.rbush.remove(shape.id)
					processedShapeIds.add(shape.id)
				}
			}

			// Handle updated shapes: page changes and bounds updates
			for (const [, to] of objectMapValues(changes.updated) as [TLShape, TLShape][]) {
				if (!isShape(to)) continue
				processedShapeIds.add(to.id)

				const isOnPage = this.editor.getAncestorPageId(to) === this.lastPageId

				if (isOnPage) {
					const bounds = this.editor.getShapePageBounds(to.id)
					if (bounds) {
						this.rbush.upsert(to.id, bounds)
					}
				} else {
					this.rbush.remove(to.id)
				}
			}
		}

		// 2. Check remaining shapes in index for bounds changes
		// This handles shapes with computed bounds (arrows bound to moved shapes, groups with moved children, etc.)
		const allShapeIds = this.rbush.getAllShapeIds()

		for (const shapeId of allShapeIds) {
			if (processedShapeIds.has(shapeId)) continue

			const currentBounds = this.editor.getShapePageBounds(shapeId)
			const indexedBounds = this.rbush.getBounds(shapeId)

			if (!this.areBoundsEqual(currentBounds, indexedBounds)) {
				if (currentBounds) {
					this.rbush.upsert(shapeId, currentBounds)
				} else {
					this.rbush.remove(shapeId)
				}
			}
		}
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
