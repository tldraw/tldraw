import { TLTableShape } from '@tldraw/editor'
import { TableColLayout, TableLayout, TableRowLayout, TABLE_CONSTANTS } from './constants'

/**
 * Build a `${rowId}:${colId}` key used to address a cell within a table.
 *
 * @public
 */
export function getCellKey(rowId: string, colId: string): string {
	return `${rowId}:${colId}`
}

/**
 * Compute a table's geometry from its stored skeleton. Pure: column widths and
 * row heights are read straight from the table's props (heights are recomputed and
 * stored by the reconciler, not re-measured here), so every client derives the
 * same layout — which is what keeps multiplayer convergent.
 *
 * @public
 */
export function getTableLayout(table: TLTableShape): TableLayout {
	const { DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT } = TABLE_CONSTANTS

	let x = 0
	const cols: TableColLayout[] = table.props.cols.map((col, index) => {
		const width = col.width || DEFAULT_COL_WIDTH
		const layout: TableColLayout = { id: col.id, index, x, width }
		x += width
		return layout
	})

	let y = 0
	const rows: TableRowLayout[] = table.props.rows.map((row, index) => {
		// The row is as tall as its content (`height`), but never shorter than a
		// user-dragged floor (`manualHeight`) — so a manually heightened row keeps its
		// size yet still grows to fit taller content.
		const height = Math.max(DEFAULT_ROW_HEIGHT, row.height ?? 0, row.manualHeight ?? 0)
		const layout: TableRowLayout = { id: row.id, index, y, height }
		y += height
		return layout
	})

	return { width: x, height: y, cols, rows }
}

/**
 * Find the cell at a point in the table's local space. Returns the `(rowId, colId)`
 * of the containing cell, or null if the point is outside the grid. Pure — takes a
 * precomputed layout.
 *
 * @public
 */
export function getCellAtPoint(
	layout: TableLayout,
	x: number,
	y: number
): { rowId: string; colId: string } | null {
	if (x < 0 || y < 0 || x > layout.width || y > layout.height) return null
	const col = layout.cols.find((c) => x >= c.x && x < c.x + c.width)
	const row = layout.rows.find((r) => y >= r.y && y < r.y + r.height)
	if (!col || !row) return null
	return { rowId: row.id, colId: col.id }
}

/**
 * The `(rowId, colId)` of every cell in the rectangular block spanned by two
 * corner cells (inclusive, order-independent). Returns an empty array if either
 * corner isn't in the table. Pure — addresses by stable id, so it survives
 * reorders. Row-major order.
 *
 * @public
 */
export function getCellsInRange(
	table: TLTableShape,
	from: { rowId: string; colId: string },
	to: { rowId: string; colId: string }
): { rowId: string; colId: string }[] {
	const { rows, cols } = table.props
	const r1 = rows.findIndex((r) => r.id === from.rowId)
	const r2 = rows.findIndex((r) => r.id === to.rowId)
	const c1 = cols.findIndex((c) => c.id === from.colId)
	const c2 = cols.findIndex((c) => c.id === to.colId)
	if (r1 === -1 || r2 === -1 || c1 === -1 || c2 === -1) return []

	const out: { rowId: string; colId: string }[] = []
	for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
		for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
			out.push({ rowId: rows[r].id, colId: cols[c].id })
		}
	}
	return out
}
