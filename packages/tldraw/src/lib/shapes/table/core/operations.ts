import { TLTableShapeColumn, TLTableShapeRow, uniqueId } from '@tldraw/editor'
import { TABLE_CONSTANTS } from './constants'

const clampIndex = (index: number, length: number) => Math.max(0, Math.min(index, length))

/**
 * Insert a new column at `atIndex` (clamped). Returns the new columns array and the
 * id of the inserted column. Pure — the caller applies it and reflows cells.
 *
 * @public
 */
export function withColumnInserted(
	cols: TLTableShapeColumn[],
	atIndex: number,
	width = TABLE_CONSTANTS.DEFAULT_COL_WIDTH
): { cols: TLTableShapeColumn[]; colId: string } {
	const colId = uniqueId()
	const next = cols.slice()
	next.splice(clampIndex(atIndex, cols.length), 0, { id: colId, width })
	return { cols: next, colId }
}

/**
 * Remove the column at `atIndex`. Returns null if it would remove the last column
 * (a table always keeps at least one). Otherwise returns the new array and the
 * removed column id (so the caller can delete that column's cells).
 *
 * @public
 */
export function withColumnRemoved(
	cols: TLTableShapeColumn[],
	atIndex: number
): { cols: TLTableShapeColumn[]; colId: string } | null {
	if (cols.length <= 1) return null
	const i = clampIndex(atIndex, cols.length - 1)
	const colId = cols[i].id
	const next = cols.slice()
	next.splice(i, 1)
	return { cols: next, colId }
}

/**
 * Insert a new row at `atIndex` (clamped). Returns the new rows array and the id of
 * the inserted row.
 *
 * @public
 */
export function withRowInserted(
	rows: TLTableShapeRow[],
	atIndex: number
): { rows: TLTableShapeRow[]; rowId: string } {
	const rowId = uniqueId()
	const next = rows.slice()
	next.splice(clampIndex(atIndex, rows.length), 0, { id: rowId })
	return { rows: next, rowId }
}

/**
 * Remove the row at `atIndex`. Returns null if it would remove the last row.
 *
 * @public
 */
export function withRowRemoved(
	rows: TLTableShapeRow[],
	atIndex: number
): { rows: TLTableShapeRow[]; rowId: string } | null {
	if (rows.length <= 1) return null
	const i = clampIndex(atIndex, rows.length - 1)
	const rowId = rows[i].id
	const next = rows.slice()
	next.splice(i, 1)
	return { rows: next, rowId }
}

/**
 * Set a column's width (clamped to the minimum). Returns a new columns array.
 *
 * @public
 */
export function withColumnWidth(
	cols: TLTableShapeColumn[],
	atIndex: number,
	width: number
): TLTableShapeColumn[] {
	if (atIndex < 0 || atIndex >= cols.length) return cols
	const next = cols.slice()
	next[atIndex] = { ...next[atIndex], width: Math.max(TABLE_CONSTANTS.MIN_COL_WIDTH, width) }
	return next
}

/**
 * Set a row's manual height — the user-dragged floor the row won't shrink below
 * (it still grows past it to fit taller content). Clamped to the row-height floor.
 * Returns a new rows array.
 *
 * @public
 */
export function withRowHeight(
	rows: TLTableShapeRow[],
	atIndex: number,
	height: number
): TLTableShapeRow[] {
	if (atIndex < 0 || atIndex >= rows.length) return rows
	const next = rows.slice()
	next[atIndex] = {
		...next[atIndex],
		manualHeight: Math.max(TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT, height),
	}
	return next
}
