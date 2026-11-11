import {
	TLTableCell,
	TLTableColumn,
	TLTableRow,
	TLTableShapeProps,
	getIndexBetween,
	getIndices,
	sortByIndex,
	uniqueId,
} from '@tldraw/editor'

/** @internal */
export const TABLE_DEFAULT_COLUMN_WIDTH = 160
/** @internal */
export const TABLE_DEFAULT_ROW_HEIGHT = 40
/** @internal */
export const TABLE_MIN_COLUMN_WIDTH = 24
/** @internal */
export const TABLE_MIN_ROW_HEIGHT = 24

type TableColumnEntry = TLTableColumn & { id: string }
type TableRowEntry = TLTableRow & { id: string }

// Sorting is cached per columns/rows object, which only changes when those props change
const sortedCache = new WeakMap<object, unknown[]>()

function getSorted<T extends TLTableColumn | TLTableRow>(
	items: Record<string, T>
): (T & { id: string })[] {
	const cached = sortedCache.get(items)
	if (cached) return cached as (T & { id: string })[]
	const sorted = Object.entries(items)
		.map(([id, item]) => ({ ...item, id }))
		.sort(sortByIndex)
	sortedCache.set(items, sorted)
	return sorted
}

/** @internal */
export function getSortedTableColumns(props: TLTableShapeProps): TableColumnEntry[] {
	return getSorted(props.columns)
}

/** @internal */
export function getSortedTableRows(props: TLTableShapeProps): TableRowEntry[] {
	return getSorted(props.rows)
}

/** @internal */
export function getTableSize(props: TLTableShapeProps) {
	let w = 0
	let h = 0
	for (const column of getSortedTableColumns(props)) w += column.width
	for (const row of getSortedTableRows(props)) h += row.height
	return { w, h }
}

/** @internal */
export function getTableCellText(props: TLTableShapeProps, rowId: string, columnId: string) {
	return props.cells[rowId]?.[columnId]?.text ?? ''
}

/**
 * Get the ids of the row and column under a point in the table's shape space, or null if the point
 * is outside the table.
 *
 * @internal
 */
export function getTableCellAtPoint(props: TLTableShapeProps, point: { x: number; y: number }) {
	const columnId = findAtOffset(getSortedTableColumns(props), point.x, (c) => c.width)
	const rowId = findAtOffset(getSortedTableRows(props), point.y, (r) => r.height)
	if (!columnId || !rowId) return null
	return { rowId, columnId }
}

function findAtOffset<T extends { id: string }>(
	items: T[],
	offset: number,
	getSize: (item: T) => number
) {
	if (offset < 0) return null
	let end = 0
	for (const item of items) {
		end += getSize(item)
		if (offset < end) return item.id
	}
	return null
}

/**
 * Get the props change that sets one cell's text. Empty cells are removed rather than stored.
 *
 * @internal
 */
export function setTableCellText(
	props: TLTableShapeProps,
	rowId: string,
	columnId: string,
	text: string
): Pick<TLTableShapeProps, 'cells'> {
	const { [columnId]: _prev, ...otherCellsInRow } = props.cells[rowId] ?? {}
	const nextRow: Record<string, TLTableCell> = text
		? { ...otherCellsInRow, [columnId]: { text } }
		: otherCellsInRow
	const { [rowId]: _prevRow, ...otherRows } = props.cells
	return {
		cells: Object.keys(nextRow).length > 0 ? { ...otherRows, [rowId]: nextRow } : otherRows,
	}
}

/** @internal */
export type TableInsertSide = 'before' | 'after'

function getInsertIndex<T extends TLTableColumn | TLTableRow>(
	sorted: (T & { id: string })[],
	id: string,
	side: TableInsertSide
) {
	const i = sorted.findIndex((item) => item.id === id)
	const before = side === 'before' ? sorted[i - 1] : sorted[i]
	const after = side === 'before' ? sorted[i] : sorted[i + 1]
	return getIndexBetween(before?.index, after?.index)
}

/** @internal */
export function insertTableRow(
	props: TLTableShapeProps,
	rowId: string,
	side: TableInsertSide
): Pick<TLTableShapeProps, 'rows'> {
	const sorted = getSortedTableRows(props)
	return {
		rows: {
			...props.rows,
			[uniqueId()]: {
				index: getInsertIndex(sorted, rowId, side),
				height: props.rows[rowId]?.height ?? TABLE_DEFAULT_ROW_HEIGHT,
			},
		},
	}
}

/** @internal */
export function insertTableColumn(
	props: TLTableShapeProps,
	columnId: string,
	side: TableInsertSide
): Pick<TLTableShapeProps, 'columns'> {
	const sorted = getSortedTableColumns(props)
	return {
		columns: {
			...props.columns,
			[uniqueId()]: {
				index: getInsertIndex(sorted, columnId, side),
				width: props.columns[columnId]?.width ?? TABLE_DEFAULT_COLUMN_WIDTH,
			},
		},
	}
}

/** @internal */
export function appendTableRow(props: TLTableShapeProps): Pick<TLTableShapeProps, 'rows'> {
	const rows = getSortedTableRows(props)
	return insertTableRow(props, rows[rows.length - 1].id, 'after')
}

/** @internal */
export function appendTableColumn(props: TLTableShapeProps): Pick<TLTableShapeProps, 'columns'> {
	const columns = getSortedTableColumns(props)
	return insertTableColumn(props, columns[columns.length - 1].id, 'after')
}

/**
 * Remove a row and its cells. The last remaining row can't be removed: deleting the whole table is
 * done by deleting the shape.
 *
 * @internal
 */
export function removeTableRow(
	props: TLTableShapeProps,
	rowId: string
): Pick<TLTableShapeProps, 'rows' | 'cells'> | undefined {
	if (Object.keys(props.rows).length <= 1) return
	const { [rowId]: _row, ...rows } = props.rows
	const { [rowId]: _cells, ...cells } = props.cells
	return { rows, cells }
}

/**
 * Remove a column and its cells. The last remaining column can't be removed.
 *
 * @internal
 */
export function removeTableColumn(
	props: TLTableShapeProps,
	columnId: string
): Pick<TLTableShapeProps, 'columns' | 'cells'> | undefined {
	if (Object.keys(props.columns).length <= 1) return
	const { [columnId]: _column, ...columns } = props.columns
	const cells: TLTableShapeProps['cells'] = {}
	for (const [rowId, row] of Object.entries(props.cells)) {
		const { [columnId]: _cell, ...rest } = row
		if (Object.keys(rest).length > 0) cells[rowId] = rest
	}
	return { columns, cells }
}

/**
 * Options for {@link createTableShapeProps}.
 *
 * @public
 */
export interface CreateTableShapePropsOptions {
	/** Width of each column. Defaults to 160. */
	columnWidth?: number
	/** Height of each row. Defaults to 40. */
	rowHeight?: number
}

/**
 * Build the `rows`, `columns` and `cells` props of a table shape from a two-dimensional array of
 * strings, one inner array per row. The table has as many columns as its longest row.
 *
 * @example
 * ```ts
 * editor.createShape({
 *   type: 'table',
 *   props: createTableShapeProps([
 *     ['Name', 'Role'],
 *     ['Ada', 'Engineer'],
 *   ]),
 * })
 * ```
 *
 * @public
 */
export function createTableShapeProps(
	data: string[][],
	opts: CreateTableShapePropsOptions = {}
): Pick<TLTableShapeProps, 'rows' | 'columns' | 'cells'> {
	const { columnWidth = TABLE_DEFAULT_COLUMN_WIDTH, rowHeight = TABLE_DEFAULT_ROW_HEIGHT } = opts
	const rowCount = Math.max(data.length, 1)
	const columnCount = Math.max(1, ...data.map((row) => row.length))

	const columnIds = Array.from({ length: columnCount }, () => uniqueId())
	const rowIds = Array.from({ length: rowCount }, () => uniqueId())
	const columnIndices = getIndices(columnCount)
	const rowIndices = getIndices(rowCount)

	const columns: Record<string, TLTableColumn> = {}
	columnIds.forEach((id, i) => {
		columns[id] = { index: columnIndices[i], width: columnWidth }
	})

	const rows: Record<string, TLTableRow> = {}
	const cells: TLTableShapeProps['cells'] = {}
	rowIds.forEach((rowId, i) => {
		rows[rowId] = { index: rowIndices[i], height: rowHeight }
		data[i]?.forEach((text, j) => {
			if (!text) return
			cells[rowId] ??= {}
			cells[rowId][columnIds[j]] = { text }
		})
	})

	return { rows, columns, cells }
}
