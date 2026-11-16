import {
	Computed,
	RESET_VALUE,
	computed,
	isUninitialized,
	unsafe__withoutCapture,
} from '@tldraw/state'
import { TLShapeId, isShape } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import type { Editor } from '../../Editor'
import type { ShapesWithDirtyBounds } from './getShapesWithDirtyBounds'
import { RBushIndex, type SpatialElement } from './RBushIndex'
import { getShapeBoundsChangesSince } from './shapeBoundsChanges'

/**
 * Manages spatial indexing for efficient shape location queries.
 *
 * Uses an R-tree (via RBush) to enable O(log n) spatial queries instead of O(n) iteration.
 * Derived-bounds changes (arrows following bound shapes, groups resizing with children) are
 * tracked structurally: each record diff is expanded into a dirty set covering the changed
 * shapes' descendants, ancestors, and binding partners, and only those shapes' bounds are
 * rechecked — O(affected) per update instead of O(page).
 *
 * Key features:
 * - Incremental updates from the shared dirty-bounds changes (see `getShapeBoundsChangesSince`)
 * - Dirty-set expansion via parent/child and binding relationships
 * - Per-page index (rebuilds on page change, theme change and font load)
 * - Optimized for viewport culling queries
 *
 * Known limitation: a custom shape whose geometry reads other shapes outside the
 * parent/child and binding relationships is not rechecked when those shapes change.
 * Core shapes only depend on other shapes via bindings (arrows) and parent/child
 * relationships (groups), which are both covered. This narrows the previous
 * approach, which rechecked every indexed shape on every update and so happened to
 * cover such shapes; the structural expansion trades that for O(affected) updates.
 *
 * @internal
 */
export class SpatialIndexManager {
	private rbush: RBushIndex
	// The value bumps only when the rbush content may have changed, so prop-only diffs don't
	// invalidate the consumers that subscribe through it.
	private spatialIndexComputed: Computed<number>

	constructor(public readonly editor: Editor) {
		this.rbush = new RBushIndex()
		this.spatialIndexComputed = computed<number>('spatialIndex', (prevEpoch, lastComputedEpoch) => {
			// The only tracked dependency. The rebuild and update below run without capture to
			// avoid registering a dependency per checked shape.
			const changes = getShapeBoundsChangesSince(editor, prevEpoch, lastComputedEpoch)
			const epoch = isUninitialized(prevEpoch) ? 0 : prevEpoch

			if (changes === RESET_VALUE) {
				unsafe__withoutCapture(() => this.buildFromScratch())
				return epoch + 1
			}

			if (!changes) return epoch

			const didChange = unsafe__withoutCapture(() => this.processIncrementalUpdate(changes))
			return didChange ? epoch + 1 : epoch
		})
	}

	private buildFromScratch(): void {
		this.rbush.clear()

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

	private processIncrementalUpdate({ dirty, removed }: ShapesWithDirtyBounds): boolean {
		const currentPageId = this.editor.getCurrentPageId()
		// Rbush mutations are collected and applied as one batch at the end so
		// large updates can use a bulk rebuild instead of per-item tree ops.
		const pendingRemoves = new Set<TLShapeId>()
		const pendingUpserts: SpatialElement[] = []

		for (const id of removed) {
			if (this.rbush.has(id)) pendingRemoves.add(id)
		}

		// Recheck only the dirty shapes' bounds. The batch stays empty
		// on prop-only updates with unchanged bounds, so they don't bump the
		// epoch.
		for (const id of dirty) {
			// A shape removed in an earlier diff entry may have been re-added in
			// a later one; its pending removal means the indexed bounds no
			// longer count.
			const indexedElement = pendingRemoves.has(id) ? undefined : this.rbush.getElement(id)
			const record = this.editor.store.unsafeGetWithoutCapture(id)

			if (!record || !isShape(record) || this.editor.getAncestorPageId(record) !== currentPageId) {
				if (this.rbush.has(id)) {
					pendingRemoves.add(id)
				}
				continue
			}

			const bounds = this.editor.getShapePageBounds(id)
			if (bounds && bounds.isValid()) {
				if (!this.areBoundsEqualToSpatialElement(bounds, indexedElement)) {
					pendingRemoves.delete(id)
					pendingUpserts.push({
						minX: bounds.minX,
						minY: bounds.minY,
						maxX: bounds.maxX,
						maxY: bounds.maxY,
						id,
					})
				}
			} else if (this.rbush.has(id)) {
				pendingRemoves.add(id)
			}
		}

		if (pendingRemoves.size === 0 && pendingUpserts.length === 0) return false

		this.rbush.applyBatch(pendingRemoves, pendingUpserts)
		return true
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
	}
}
