import {
	Computed,
	RESET_VALUE,
	computed,
	isUninitialized,
	unsafe__withoutCapture,
} from '@tldraw/state'
import type { RecordsDiff } from '@tldraw/store'
import { TLPageId, TLShapeId, isShape } from '@tldraw/tlschema'
import type { TLRecord } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import type { Editor } from '../../Editor'
import { getShapesWithDirtyBounds } from './getShapesWithDirtyBounds'
import { RBushIndex, type SpatialElement } from './RBushIndex'

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
 * - Incremental updates using filterHistory pattern (shape and binding history)
 * - Dirty-set expansion via parent/child and binding relationships
 * - Per-page index (rebuilds on page change)
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
	private spatialIndexComputed: Computed<number>
	private lastPageId: TLPageId | null = null
	private lastFontLoadEpoch = -1

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
			// These four reads are the computed's only tracked dependencies: shape
			// and binding record changes, plus font loads (measured text resizes
			// when its font swaps in). Theme changes that resize shapes without a
			// record diff (e.g. `updateTheme({ fontSize })`) are not tracked, so
			// the index stays stale for those until the next rebuild.
			// The rebuild/update paths below run without capture to avoid
			// registering a dependency per checked shape on every update (and
			// ~page-size dependencies on every rebuild).
			const shapeDiff = shapeHistory.getDiffSince(lastComputedEpoch)
			const bindingDiff = bindingHistory.getDiffSince(lastComputedEpoch)
			const currentPageId = this.editor.getCurrentPageId()
			const fontLoadEpoch = this.editor.fonts.getFontLoadEpoch()

			if (
				isUninitialized(_prevValue) ||
				shapeDiff === RESET_VALUE ||
				bindingDiff === RESET_VALUE ||
				this.lastPageId !== currentPageId ||
				// Which shapes a font load resizes isn't known without visiting
				// every shape, so rebuild; loads are rare and bounded by the
				// number of distinct fonts.
				this.lastFontLoadEpoch !== fontLoadEpoch
			) {
				return unsafe__withoutCapture(() => this.rebuildAndBumpEpoch())
			}

			if (shapeDiff.length === 0 && bindingDiff.length === 0) return this._boundsEpoch

			if (unsafe__withoutCapture(() => this.processIncrementalUpdate(shapeDiff, bindingDiff))) {
				this._boundsEpoch++
			}
			return this._boundsEpoch
		})
	}

	private buildFromScratch(): void {
		this.rbush.clear()
		this.lastPageId = this.editor.getCurrentPageId()
		this.lastFontLoadEpoch = this.editor.fonts.getFontLoadEpoch()

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

	private processIncrementalUpdate(
		shapeDiff: RecordsDiff<TLRecord>[],
		bindingDiff: RecordsDiff<TLRecord>[]
	): boolean {
		// Rbush mutations are collected and applied as one batch at the end so
		// large updates can use a bulk rebuild instead of per-item tree ops.
		const pendingRemoves = new Set<TLShapeId>()
		const pendingUpserts: SpatialElement[] = []

		const { dirty, removed } = getShapesWithDirtyBounds(this.editor, shapeDiff, bindingDiff)

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

			if (
				!record ||
				!isShape(record) ||
				this.editor.getAncestorPageId(record) !== this.lastPageId
			) {
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
		this.lastPageId = null
	}
}
