import type { TLShapeId } from '@tldraw/tlschema'
import RBush from 'rbush'
import { Box } from '../../../primitives/Box'

/**
 * Element stored in the R-tree spatial index.
 * Contains bounds (minX, minY, maxX, maxY) and shape ID.
 */
export interface SpatialElement {
	minX: number
	minY: number
	maxX: number
	maxY: number
	id: TLShapeId
}

/**
 * Custom RBush class for tldraw shapes.
 */
class TldrawRBush extends RBush<SpatialElement> {}

/**
 * Wrapper around RBush R-tree for efficient spatial queries.
 * Maintains a map of elements currently in the tree for efficient updates.
 */
export class RBushIndex {
	private rBush: TldrawRBush
	private elementsInTree: Map<TLShapeId, SpatialElement>

	constructor() {
		this.rBush = new TldrawRBush()
		this.elementsInTree = new Map()
	}

	/**
	 * Search for shapes within the given bounds.
	 * Returns set of shape IDs that intersect with the bounds.
	 */
	search(bounds: Box): Set<TLShapeId> {
		const results = this.rBush.search({
			minX: bounds.minX,
			minY: bounds.minY,
			maxX: bounds.maxX,
			maxY: bounds.maxY,
		})
		return new Set(results.map((e: SpatialElement) => e.id))
	}

	/**
	 * Remove a shape from the spatial index.
	 */
	remove(id: TLShapeId): void {
		const element = this.elementsInTree.get(id)
		if (element) {
			this.rBush.remove(element)
			this.elementsInTree.delete(id)
		}
	}

	/**
	 * Apply the removals and upserts collected during one incremental update.
	 * Mutations are applied per item: bulk-rebuilding the whole tree instead
	 * was measured slower even with ~10% of the index in the batch.
	 */
	applyBatch(removes: Set<TLShapeId>, upserts: SpatialElement[]): void {
		for (const id of removes) {
			this.remove(id)
		}
		for (const element of upserts) {
			const existing = this.elementsInTree.get(element.id)
			if (existing) {
				this.rBush.remove(existing)
			}
			this.rBush.insert(element)
			this.elementsInTree.set(element.id, element)
		}
	}

	/**
	 * Bulk load elements into the spatial index.
	 * More efficient than individual inserts for initial loading.
	 */
	bulkLoad(elements: SpatialElement[]): void {
		this.rBush.load(elements)
		for (const element of elements) {
			this.elementsInTree.set(element.id, element)
		}
	}

	/**
	 * Clear all elements from the spatial index.
	 */
	clear(): void {
		this.rBush.clear()
		this.elementsInTree.clear()
	}

	/**
	 * Check if a shape is in the spatial index.
	 */
	has(id: TLShapeId): boolean {
		return this.elementsInTree.has(id)
	}

	/**
	 * Get the number of elements in the spatial index.
	 */
	getSize(): number {
		return this.elementsInTree.size
	}

	/**
	 * Get the raw stored element for a shape, without allocating a Box.
	 * Use when you only need to read the indexed bounds for comparison.
	 *
	 * @internal
	 */
	getElement(id: TLShapeId): SpatialElement | undefined {
		return this.elementsInTree.get(id)
	}

	/**
	 * Dispose of the spatial index.
	 * Clears all data structures to prevent memory leaks.
	 */
	dispose(): void {
		this.clear()
	}
}
