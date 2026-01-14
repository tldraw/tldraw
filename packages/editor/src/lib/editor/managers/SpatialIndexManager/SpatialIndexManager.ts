import { Computed, RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import type { RecordsDiff } from '@tldraw/store'
import type { TLRecord } from '@tldraw/tlschema'
import { TLPageId, TLShape, TLShapeId, isShape } from '@tldraw/tlschema'
import { objectMapValues } from '@tldraw/utils'
import { Box } from '../../../primitives/Box'
import { debugFlags } from '../../../utils/debug-flags'
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
 * @public
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
				if (debugFlags.perfLogSpatialIndex.get()) {
					// eslint-disable-next-line no-console
					console.log(`[Perf] spatial index: page change detected, rebuilding`)
				}
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
		const perfStart = performance.now()
		this.rbush.clear()
		this.lastPageId = this.editor.getCurrentPageId()

		const shapesStart = performance.now()
		const shapes = this.editor.getCurrentPageShapesSorted()
		if (debugFlags.perfLogSpatialIndex.get()) {
			// eslint-disable-next-line no-console
			console.log(
				`[Perf]   spatial index getCurrentPageShapesSorted: ${(performance.now() - shapesStart).toFixed(3)}ms`
			)
		}

		const elements: SpatialElement[] = []

		// Collect all shape elements for bulk loading
		const elementsStart = performance.now()
		let boundsTime = 0
		for (const shape of shapes) {
			const boundsStart = performance.now()
			const element = this.createElementForShape(shape.id)
			boundsTime += performance.now() - boundsStart
			if (element) elements.push(element)
		}
		if (debugFlags.perfLogSpatialIndex.get()) {
			// eslint-disable-next-line no-console
			console.log(
				`[Perf]   spatial index creating elements: ${(performance.now() - elementsStart).toFixed(3)}ms`
			)
			// eslint-disable-next-line no-console
			console.log(
				`[Perf]     spatial index getShapePageBounds calls: ${boundsTime.toFixed(4)}ms (avg: ${(boundsTime / shapes.length).toFixed(5)}ms per shape)`
			)
		}

		// Bulk load for efficiency
		this.rbush.bulkLoad(elements)

		if (debugFlags.perfLogSpatialIndex.get()) {
			// eslint-disable-next-line no-console
			console.log(
				`[Perf] spatial index buildFromScratch: ${(performance.now() - perfStart).toFixed(3)}ms (${shapes.length} shapes)`
			)
		}
		return epoch
	}

	private processIncrementalUpdate(shapeDiff: RecordsDiff<TLRecord>[]): void {
		const perfStart = performance.now()

		// 1. Process shape additions and removals from diff
		for (const changes of shapeDiff) {
			// Handle additions (only for shapes on current page)
			for (const shape of objectMapValues(changes.added) as TLShape[]) {
				if (isShape(shape) && this.editor.getAncestorPageId(shape) === this.lastPageId) {
					const element = this.createElementForShape(shape.id)
					if (element) {
						const bounds = new Box(
							element.minX,
							element.minY,
							element.maxX - element.minX,
							element.maxY - element.minY
						)
						this.rbush.insert(shape.id, bounds)
					}
				}
			}

			// Handle removals
			for (const shape of objectMapValues(changes.removed) as TLShape[]) {
				if (isShape(shape)) {
					this.rbush.remove(shape.id)
				}
			}
		}

		// 2. Check ALL shapes in index for bounds changes
		// This handles shapes with computed bounds (arrows bound to moved shapes, groups with moved children, etc.)
		// The bounds cache is reactive, so getShapePageBounds automatically returns updated bounds
		const allShapeIds = this.rbush.getAllShapeIds()
		let boundsChecks = 0
		let boundsUpdates = 0
		const boundsCheckStart = performance.now()

		for (const shapeId of allShapeIds) {
			boundsChecks++
			const currentBounds = this.editor.getShapePageBounds(shapeId)
			const indexedBounds = this.rbush.getBounds(shapeId)

			if (!this.areBoundsEqual(currentBounds, indexedBounds)) {
				boundsUpdates++
				if (debugFlags.perfLogSpatialIndex.get()) {
					const shape = this.editor.getShape(shapeId)
					// eslint-disable-next-line no-console
					console.log(
						`[Perf] spatial index bounds changed for ${shapeId} (${shape?.type}): ` +
							`${indexedBounds ? `[${indexedBounds.minX.toFixed(1)},${indexedBounds.minY.toFixed(1)},${indexedBounds.maxX.toFixed(1)},${indexedBounds.maxY.toFixed(1)}]` : 'null'} → ` +
							`${currentBounds ? `[${currentBounds.minX.toFixed(1)},${currentBounds.minY.toFixed(1)},${currentBounds.maxX.toFixed(1)},${currentBounds.maxY.toFixed(1)}]` : 'null'}`
					)
				}
				this.rbush.remove(shapeId)
				if (currentBounds) {
					this.rbush.insert(shapeId, currentBounds)
				}
			}
		}

		if (debugFlags.perfLogSpatialIndex.get()) {
			// eslint-disable-next-line no-console
			console.log(
				`[Perf] spatial index processIncrementalUpdate: ${(performance.now() - perfStart).toFixed(3)}ms ` +
					`(checked ${boundsChecks} shapes in ${(performance.now() - boundsCheckStart).toFixed(3)}ms, updated ${boundsUpdates})`
			)
		}
	}

	private createElementForShape(shapeId: TLShapeId): SpatialElement | null {
		const bounds = this.editor.getShapePageBounds(shapeId)
		if (!bounds) return null

		return {
			minX: bounds.minX,
			minY: bounds.minY,
			maxX: bounds.maxX,
			maxY: bounds.maxY,
			id: shapeId,
		}
	}

	private areBoundsEqual(a: Box | undefined, b: Box | undefined): boolean {
		if (!a && !b) return true
		if (!a || !b) return false
		return a.minX === b.minX && a.minY === b.minY && a.maxX === b.maxX && a.maxY === b.maxY
	}

	/**
	 * Check if bounds are outside the root bounds (early exit optimization)
	 */
	private isOutsideRootBounds(bounds: Box): boolean {
		const rootBounds = this.rbush.getRootBounds()
		return (
			rootBounds !== undefined &&
			rootBounds.minX !== Infinity &&
			rootBounds.maxX !== -Infinity &&
			rootBounds.minY !== Infinity &&
			rootBounds.maxY !== -Infinity &&
			(bounds.maxX < rootBounds.minX ||
				bounds.minX > rootBounds.maxX ||
				bounds.maxY < rootBounds.minY ||
				bounds.minY > rootBounds.maxY)
		)
	}

	/**
	 * Get shape IDs within the given bounds.
	 * Optimized for viewport culling queries.
	 *
	 * @param bounds - The bounds to search within
	 * @returns Array of shape IDs within the bounds
	 *
	 * @public
	 */
	getShapeIdsInsideBounds(bounds: Box): TLShapeId[] {
		const perfStart = performance.now()

		// Ensure index is up to date
		const indexStart = performance.now()
		this.spatialIndexComputed.get()
		const indexTime = performance.now() - indexStart

		// Quick bounds check (must be after index update to avoid stale data)
		if (this.isOutsideRootBounds(bounds)) {
			if (debugFlags.perfLogSpatialIndex.get()) {
				// eslint-disable-next-line no-console
				console.log(
					`[Perf] spatial index getShapeIdsInsideBounds: ${(performance.now() - perfStart).toFixed(3)}ms (0 shapes - outside bounds)`
				)
			}
			return []
		}

		const searchStart = performance.now()
		const result = this.rbush.search(bounds)
		const searchTime = performance.now() - searchStart

		if (debugFlags.perfLogSpatialIndex.get()) {
			// eslint-disable-next-line no-console
			console.log(
				`[Perf] spatial index getShapeIdsInsideBounds: ${(performance.now() - perfStart).toFixed(3)}ms (index: ${indexTime.toFixed(3)}ms, search: ${searchTime.toFixed(3)}ms, ${result.length} shapes found)`
			)
		}
		return result
	}

	/**
	 * Get shape IDs at a point (with optional margin).
	 * Creates a small bounding box around the point and searches the spatial index.
	 *
	 * @param point - The point to search at
	 * @param margin - The margin around the point to search (default: 0)
	 * @returns Array of shape IDs that could potentially contain the point
	 *
	 * @public
	 */
	getShapeIdsAtPoint(point: { x: number; y: number }, margin = 0): TLShapeId[] {
		const perfStart = performance.now()

		// Create a small bounds around the point
		const searchBounds = new Box(point.x - margin, point.y - margin, margin * 2, margin * 2)

		// Ensure index is up to date
		this.spatialIndexComputed.get()

		// Quick bounds check (must be after index update to avoid stale data)
		if (this.isOutsideRootBounds(searchBounds)) {
			if (debugFlags.perfLogSpatialIndex.get()) {
				// eslint-disable-next-line no-console
				console.log(
					`[Perf] spatial index getShapeIdsAtPoint: ${(performance.now() - perfStart).toFixed(3)}ms (0 candidates - outside bounds)`
				)
			}
			return []
		}

		// Search the spatial index
		const result = this.rbush.search(searchBounds)

		if (debugFlags.perfLogSpatialIndex.get()) {
			// eslint-disable-next-line no-console
			console.log(
				`[Perf] spatial index getShapeIdsAtPoint: ${(performance.now() - perfStart).toFixed(3)}ms (${result.length} candidate shapes found)`
			)
		}

		return result
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
