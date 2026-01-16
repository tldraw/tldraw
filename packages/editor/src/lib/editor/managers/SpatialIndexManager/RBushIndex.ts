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
	 * Insert or update a shape in the spatial index.
	 * If the shape already exists, it will be removed first to prevent duplicates.
	 */
	upsert(id: TLShapeId, bounds: Box): void {
		// Remove existing entry to prevent map-tree desync
		const existing = this.elementsInTree.get(id)
		if (existing) {
			this.rBush.remove(existing)
		}

		const element: SpatialElement = {
			minX: bounds.minX,
			minY: bounds.minY,
			maxX: bounds.maxX,
			maxY: bounds.maxY,
			id,
		}
		this.rBush.insert(element)
		this.elementsInTree.set(id, element)
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
	 * Get all shape IDs currently in the spatial index.
	 */
	getAllShapeIds(): TLShapeId[] {
		return Array.from(this.elementsInTree.keys())
	}

	/**
	 * Get the bounds currently stored in the spatial index for a shape.
	 * Returns undefined if the shape is not in the index.
	 */
	getBounds(id: TLShapeId): Box | undefined {
		const element = this.elementsInTree.get(id)
		if (!element) return undefined
		return new Box(
			element.minX,
			element.minY,
			element.maxX - element.minX,
			element.maxY - element.minY
		)
	}

	/**
	 * Dispose of the spatial index.
	 * Clears all data structures to prevent memory leaks.
	 */
	dispose(): void {
		this.clear()
	}
}
