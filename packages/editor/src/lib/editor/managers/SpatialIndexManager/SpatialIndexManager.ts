import {
	Computed,
	RESET_VALUE,
	computed,
	isUninitialized,
	unsafe__withoutCapture,
} from '@tldraw/state'
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
			// These three reads are the computed's only tracked dependencies.
			// Every input to a shape's page bounds is a shape or binding record,
			// so the two histories cover all invalidation; the rebuild/update
			// paths below run without capture to avoid registering a dependency
			// per checked shape on every update (and ~page-size dependencies on
			// every rebuild).
			const shapeDiff = shapeHistory.getDiffSince(lastComputedEpoch)
			const bindingDiff = bindingHistory.getDiffSince(lastComputedEpoch)
			const currentPageId = this.editor.getCurrentPageId()

			if (
				isUninitialized(_prevValue) ||
				shapeDiff === RESET_VALUE ||
				bindingDiff === RESET_VALUE ||
				this.lastPageId !== currentPageId
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
					pendingRemoves.add(shape.id)
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
			for (const [from, to] of objectMapValues(changes.updated)) {
				if (!isBinding(to)) continue
				markDirty(to.fromId)
				markDirty(to.toId)
				// A reassigned binding leaves its old endpoints needing a
				// recheck too (mirrors the reparent case for shapes above).
				if (isBinding(from) && (from.fromId !== to.fromId || from.toId !== to.toId)) {
					markDirty(from.fromId)
					markDirty(from.toId)
				}
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

		// Step 4: recheck only the dirty shapes' bounds. The batch stays empty
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
