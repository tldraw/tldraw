/**
 * Shared sizing constants for the table shape. Kept in one place so the util,
 * layout, rendering, and measurement code all agree on geometry.
 *
 * @public
 */
export const TABLE_CONSTANTS = {
	DEFAULT_COL_WIDTH: 120,
	MIN_COL_WIDTH: 40,
	/** Base / minimum row height. Rows grow above this to fit their content. */
	DEFAULT_ROW_HEIGHT: 32,
	CELL_PADDING: 6,
	BORDER_WIDTH: 1,
} as const

/**
 * The computed layout of a single column, in table-local space.
 *
 * @public
 */
export interface TableColLayout {
	id: string
	index: number
	/** x offset of the column's left edge */
	x: number
	width: number
}

/**
 * The computed layout of a single row, in table-local space.
 *
 * @public
 */
export interface TableRowLayout {
	id: string
	index: number
	/** y offset of the row's top edge */
	y: number
	height: number
}

/**
 * The full computed layout of a table: total size plus per-row/column geometry.
 *
 * @public
 */
export interface TableLayout {
	width: number
	height: number
	cols: TableColLayout[]
	rows: TableRowLayout[]
}
