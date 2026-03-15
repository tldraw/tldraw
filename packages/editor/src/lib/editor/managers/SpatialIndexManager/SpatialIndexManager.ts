import { TLBinding, TLPageId, TLShape, TLShapeId } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import type { Editor } from '../../Editor'
import { GridIndex } from './GridIndex'

/**
 * Manages spatial indexing for efficient shape location queries.
 *
 * Uses a grid-based spatial index with fixed-size cells for efficient viewport culling.
 * Updated eagerly via store side effects when shapes are created, changed, or deleted.
 * Rebuilds when the current page changes.
 *
 * @internal
 */
export class SpatialIndexManager {
	private grid = new GridIndex()
	private currentPageId: TLPageId | null = null
	private dispose: () => void

	constructor(public readonly editor: Editor) {
		this.dispose = this.editor.store.sideEffects.register({
			shape: {
				afterCreate: (shape: TLShape) => {
					if (!this.isOnCurrentPage(shape)) return
					this.updateShape(shape.id)
					this.updateAncestors(shape)
				},
				afterChange: (_shapeBefore: TLShape, shapeAfter: TLShape) => {
					if (!this.isOnCurrentPage(shapeAfter)) {
						this.grid.remove(shapeAfter.id)
						return
					}
					this.updateShape(shapeAfter.id)
					this.updateAncestors(shapeAfter)
					this.updateDescendants(shapeAfter.id)
					this.updateBoundShapes(shapeAfter.id)
				},
				afterDelete: (shape: TLShape) => {
					this.grid.remove(shape.id)
				},
			},
			binding: {
				afterCreate: (binding: TLBinding) => {
					this.updateShape(binding.fromId)
				},
				afterChange: (_before: TLBinding, after: TLBinding) => {
					this.updateShape(after.fromId)
				},
				afterDelete: (binding: TLBinding) => {
					this.updateShape(binding.fromId)
				},
			},
		})
	}

	private isOnCurrentPage(shape: TLShape): boolean {
		return this.editor.getAncestorPageId(shape) === this.currentPageId
	}

	private updateShape(id: TLShapeId): void {
		const bounds = this.editor.getShapePageBounds(id)
		if (bounds) {
			this.grid.upsert(id, bounds)
		} else {
			this.grid.remove(id)
		}
	}

	private updateAncestors(shape: TLShape): void {
		let current = this.editor.getShape(shape.parentId as TLShapeId)
		while (current) {
			this.updateShape(current.id)
			current = this.editor.getShape(current.parentId as TLShapeId)
		}
	}

	private updateDescendants(id: TLShapeId): void {
		const childIds = this.editor.getSortedChildIdsForParent(id)
		for (const childId of childIds) {
			this.updateShape(childId)
			this.updateDescendants(childId)
		}
	}

	private updateBoundShapes(id: TLShapeId): void {
		const shape = this.editor.getShape(id)
		if (!shape) return
		for (const binding of this.editor.getBindingsInvolvingShape(shape)) {
			// Update the "from" shape (e.g., the arrow) when a "to" shape (target) changes
			if (binding.toId === id) {
				this.updateShape(binding.fromId)
			}
		}
	}

	private ensureCurrentPage(): void {
		const pageId = this.editor.getCurrentPageId()
		if (this.currentPageId !== pageId) {
			this.grid.clear()
			this.currentPageId = pageId

			for (const shape of this.editor.getCurrentPageShapes()) {
				const bounds = this.editor.getShapePageBounds(shape.id)
				if (bounds) {
					this.grid.upsert(shape.id, bounds)
				}
			}
		}
	}

	/**
	 * Get shape IDs within the given bounds.
	 *
	 * @param bounds - The bounds to search within
	 * @returns Unordered set of shape IDs within the bounds
	 *
	 * @public
	 */
	getShapeIdsInsideBounds(bounds: Box): Set<TLShapeId> {
		this.ensureCurrentPage()
		return this.grid.search(bounds)
	}

	/**
	 * Get shape IDs at a point (with optional margin).
	 *
	 * @param point - The point to search at
	 * @param margin - The margin around the point to search (default: 0)
	 * @returns Unordered set of shape IDs that could potentially contain the point
	 *
	 * @public
	 */
	getShapeIdsAtPoint(point: { x: number; y: number }, margin = 0): Set<TLShapeId> {
		this.ensureCurrentPage()
		return this.grid.search(new Box(point.x - margin, point.y - margin, margin * 2, margin * 2))
	}

	/**
	 * Dispose of the spatial index manager.
	 *
	 * @public
	 */
	destroy(): void {
		this.dispose()
		this.grid.dispose()
	}
}
