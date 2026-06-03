import { TLTableShape } from '@tldraw/editor'

/**
 * Build a row-major 2D grid of a table's contents using a `valueOf(rowId, colId)`
 * accessor. Pure — the editor-coupled `getTableData` passes an accessor that reads
 * cell text; consumers can pass any accessor (e.g. for CSV/Excel export). This is
 * the seam the SDK exposes; the serialization *format* stays consumer-owned.
 *
 * @public
 */
export function buildGrid<T>(
	table: TLTableShape,
	valueOf: (rowId: string, colId: string) => T
): T[][] {
	return table.props.rows.map((row) => table.props.cols.map((col) => valueOf(row.id, col.id)))
}
