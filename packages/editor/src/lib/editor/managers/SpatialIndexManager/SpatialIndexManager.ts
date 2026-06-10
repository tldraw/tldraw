import { Computed, RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import type { RecordsDiff } from '@tldraw/store'
import { TLPageId, TLShape, TLShapeId, isBinding, isPageId, isShape } from '@tldraw/tlschema'
import type { TLRecord } from '@tldraw/tlschema'
import { objectMapValues } from '@tldraw/utils'
import { Box } from '../../../primitives/Box'
import type { Editor } from '../../Editor'
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
 * relationships (groups), which are both covered.
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
		const bindingHistory = this.editor.store.query.filterHistory('binding')

		return computed<number>('spatialIndex', (_prevValue, lastComputedEpoch) => {
			if (isUninitialized(_prevValue)) {
				return this.rebuildAndBumpEpoch()
			}

			const shapeDiff = shapeHistory.getDiffSince(lastComputedEpoch)

			if (shapeDiff === RESET_VALUE) {
				return this.rebuildAndBumpEpoch()
			}

			const bindingDiff = bindingHistory.getDiffSince(lastComputedEpoch)

			if (bindingDiff === RESET_VALUE) {
				return this.rebuildAndBumpEpoch()
			}

			const currentPageId = this.editor.getCurrentPageId()
			if (this.lastPageId !== currentPageId) {
				return this.rebuildAndBumpEpoch()
			}

			if (shapeDiff.length === 0 && bindingDiff.length === 0) return this._boundsEpoch

			if (this.processIncrementalUpdate(shapeDiff, bindingDiff)) {
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

	private processIncrementalUpdate(
		shapeDiff: RecordsDiff<TLRecord>[],
		bindingDiff: RecordsDiff<TLRecord>[]
	): boolean {
		let changed = false

		// Shapes whose page transform may have moved (their record was added or
		// updated). Their descendants' transforms move with them.
		const transformChanged = new Set<TLShapeId>()
		// Shapes whose page bounds need rechecking against the index.
		const dirty = new Set<TLShapeId>()
		// Subset of `dirty` not yet expanded into ancestors/binding partners.
		const queue: TLShapeId[] = []

		const markDirty = (id: TLShapeId) => {
			if (!dirty.has(id)) {
				dirty.add(id)
				queue.push(id)
			}
		}

		// Step 1: seed the dirty set from the record diffs.
		for (const changes of shapeDiff) {
			for (const shape of objectMapValues(changes.added) as TLShape[]) {
				if (!isShape(shape)) continue
				transformChanged.add(shape.id)
				markDirty(shape.id)
			}

			for (const shape of objectMapValues(changes.removed) as TLShape[]) {
				if (!isShape(shape)) continue
				if (this.rbush.has(shape.id)) {
					this.rbush.remove(shape.id)
					changed = true
				}
				// The old parent's derived bounds (groups) may shrink. Bindings
				// involving the shape are deleted in the same transaction, so the
				// binding diff below dirties the other ends.
				if (!isPageId(shape.parentId)) markDirty(shape.parentId)
			}

			for (const [from, to] of objectMapValues(changes.updated) as [TLShape, TLShape][]) {
				if (!isShape(to)) continue
				transformChanged.add(to.id)
				markDirty(to.id)
				// On reparent, the old ancestor chain needs rechecking too
				if (isShape(from) && from.parentId !== to.parentId && !isPageId(from.parentId)) {
					markDirty(from.parentId)
				}
			}
		}

		for (const changes of bindingDiff) {
			for (const binding of objectMapValues(changes.added)) {
				if (!isBinding(binding)) continue
				markDirty(binding.fromId)
				markDirty(binding.toId)
			}
			for (const binding of objectMapValues(changes.removed)) {
				if (!isBinding(binding)) continue
				markDirty(binding.fromId)
				markDirty(binding.toId)
			}
			for (const [, to] of objectMapValues(changes.updated)) {
				if (!isBinding(to)) continue
				markDirty(to.fromId)
				markDirty(to.toId)
			}
		}

		// Step 2: a moved record moves the page transforms of all its
		// descendants, so their bounds need rechecking even though their
		// records never changed. Expand before the fixpoint below so each
		// descendant also gets its ancestors and binding partners visited.
		const transformQueue = [...transformChanged]
		while (transformQueue.length) {
			const id = transformQueue.pop()!
			for (const childId of this.editor.getSortedChildIdsForParent(id)) {
				if (!transformChanged.has(childId)) {
					transformChanged.add(childId)
					transformQueue.push(childId)
				}
				markDirty(childId)
			}
		}

		// Step 3: expand to a fixpoint. Any shape whose bounds may have changed
		// can resize its ancestor groups and move arrows bound to it. A derived
		// bounds change does not move the shape's own transform, so descendants
		// are not affected by this expansion (only by step 2).
		while (queue.length) {
			const id = queue.pop()!

			const record = this.editor.store.unsafeGetWithoutCapture(id)
			if (record && isShape(record) && !isPageId(record.parentId)) {
				markDirty(record.parentId)
			}

			for (const binding of this.editor.getBindingsInvolvingShape(id)) {
				markDirty(binding.fromId)
				markDirty(binding.toId)
			}
		}

		// Step 4: recheck only the dirty shapes' bounds. `changed` flips only on
		// real rbush mutations, so prop-only updates with unchanged bounds don't
		// bump the epoch.
		for (const id of dirty) {
			const indexedElement = this.rbush.getElement(id)
			const record = this.editor.store.unsafeGetWithoutCapture(id)

			if (
				!record ||
				!isShape(record) ||
				this.editor.getAncestorPageId(record) !== this.lastPageId
			) {
				if (indexedElement) {
					this.rbush.remove(id)
					changed = true
				}
				continue
			}

			const bounds = this.editor.getShapePageBounds(id)
			if (bounds && bounds.isValid()) {
				if (!this.areBoundsEqualToSpatialElement(bounds, indexedElement)) {
					this.rbush.upsert(id, bounds)
					changed = true
				}
			} else if (indexedElement) {
				this.rbush.remove(id)
				changed = true
			}
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
