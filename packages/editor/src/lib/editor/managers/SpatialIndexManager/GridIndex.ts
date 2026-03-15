import type { TLShapeId } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'

/** Size of each grid cell in page coordinates. */
export const GRID_CELL_SIZE = 500

function cellKey(col: number, row: number): string {
	return `${col}:${row}`
}

function toCol(x: number): number {
	return Math.floor(x / GRID_CELL_SIZE)
}

function toRow(y: number): number {
	return Math.floor(y / GRID_CELL_SIZE)
}

/**
 * Simple grid-based spatial index for shape culling and hit testing.
 *
 * Divides page space into cells of GRID_CELL_SIZE x GRID_CELL_SIZE.
 * Each shape is stored in every cell its bounding box overlaps.
 * Queries find all cells overlapping the query bounds and union their shapes.
 */
export class GridIndex {
	/** Map from cell key to set of shape IDs in that cell */
	private cells = new Map<string, Set<TLShapeId>>()
	/** Map from shape ID to its current bounds (for removal on update) */
	private shapeBounds = new Map<TLShapeId, Box>()

	/**
	 * Search for shapes within the given bounds.
	 */
	search(bounds: Box): Set<TLShapeId> {
		const result = new Set<TLShapeId>()

		const minCol = toCol(bounds.minX)
		const maxCol = toCol(bounds.maxX)
		const minRow = toRow(bounds.minY)
		const maxRow = toRow(bounds.maxY)

		for (let col = minCol; col <= maxCol; col++) {
			for (let row = minRow; row <= maxRow; row++) {
				const cell = this.cells.get(cellKey(col, row))
				if (cell) {
					for (const id of cell) {
						result.add(id)
					}
				}
			}
		}

		return result
	}

	/**
	 * Insert or update a shape in the grid index.
	 */
	upsert(id: TLShapeId, bounds: Box): void {
		this.remove(id)
		this.shapeBounds.set(id, bounds.clone())

		const minCol = toCol(bounds.minX)
		const maxCol = toCol(bounds.maxX)
		const minRow = toRow(bounds.minY)
		const maxRow = toRow(bounds.maxY)

		for (let col = minCol; col <= maxCol; col++) {
			for (let row = minRow; row <= maxRow; row++) {
				const key = cellKey(col, row)
				let cell = this.cells.get(key)
				if (!cell) {
					cell = new Set()
					this.cells.set(key, cell)
				}
				cell.add(id)
			}
		}
	}

	/**
	 * Remove a shape from the grid index.
	 */
	remove(id: TLShapeId): void {
		const bounds = this.shapeBounds.get(id)
		if (!bounds) return

		const minCol = toCol(bounds.minX)
		const maxCol = toCol(bounds.maxX)
		const minRow = toRow(bounds.minY)
		const maxRow = toRow(bounds.maxY)

		for (let col = minCol; col <= maxCol; col++) {
			for (let row = minRow; row <= maxRow; row++) {
				const key = cellKey(col, row)
				const cell = this.cells.get(key)
				if (cell) {
					cell.delete(id)
					if (cell.size === 0) {
						this.cells.delete(key)
					}
				}
			}
		}

		this.shapeBounds.delete(id)
	}

	/**
	 * Get the bounds currently stored for a shape.
	 */
	getBounds(id: TLShapeId): Box | undefined {
		return this.shapeBounds.get(id)
	}

	/**
	 * Get all shape IDs currently in the index.
	 */
	getAllShapeIds(): TLShapeId[] {
		return Array.from(this.shapeBounds.keys())
	}

	clear(): void {
		this.cells.clear()
		this.shapeBounds.clear()
	}

	dispose(): void {
		this.clear()
	}
}
