import {
	Editor,
	TLShapeId,
	TLShapePartial,
	TLTableCellShape,
	TLTableShape,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { isEmptyRichText, renderPlaintextFromRichText } from '../../utils/text/richText'
import {
	getCellKey,
	getTableLayout,
	resolveCellStyle,
	withColumnInserted,
	withColumnRemoved,
	withColumnWidth,
	withRowHeight,
	withRowInserted,
	withRowRemoved,
} from './core'

/** Collect a table's cell records, keyed by `(rowId, colId)`. @public */
export function getTableCells(
	editor: Editor,
	tableId: TLTableShape['id']
): Map<string, TLTableCellShape> {
	const cells = new Map<string, TLTableCellShape>()
	for (const id of editor.getSortedChildIdsForParent(tableId)) {
		const child = editor.getShape(id)
		if (child && child.type === 'table-cell') {
			const cell = child as TLTableCellShape
			cells.set(getCellKey(cell.props.rowId, cell.props.colId), cell)
		}
	}
	return cells
}

/**
 * Read a table's content as an ordered 2D array of plain text (rows × columns).
 * Empty cells are `''`. The building block for CSV/Excel export — the SDK leaves
 * the serialization format to the consumer.
 *
 * @public
 */
export function getTableData(editor: Editor, tableId: TLTableShape['id']): string[][] {
	const table = editor.getShape(tableId)
	if (!table || table.type !== 'table') return []
	const cells = getTableCells(editor, tableId)
	return (table as TLTableShape).props.rows.map((row) =>
		(table as TLTableShape).props.cols.map((col) => {
			const cell = cells.get(getCellKey(row.id, col.id))
			return cell ? renderPlaintextFromRichText(editor, cell.props.richText) : ''
		})
	)
}

/** Read a single cell's plain text by row/column index. @public */
export function getCellText(
	editor: Editor,
	tableId: TLTableShape['id'],
	rowIndex: number,
	colIndex: number
): string {
	const table = editor.getShape(tableId)
	if (!table || table.type !== 'table') return ''
	const t = table as TLTableShape
	const row = t.props.rows[rowIndex]
	const col = t.props.cols[colIndex]
	if (!row || !col) return ''
	const cell = getTableCells(editor, tableId).get(getCellKey(row.id, col.id))
	return cell ? renderPlaintextFromRichText(editor, cell.props.richText) : ''
}

/**
 * Set a cell's plain text by row/column index, creating the cell if needed. The
 * counterpart to {@link getTableData} for importing data.
 *
 * @public
 */
export function setCellText(
	editor: Editor,
	tableId: TLTableShape['id'],
	rowIndex: number,
	colIndex: number,
	text: string
) {
	const table = editor.getShape(tableId)
	if (!table || table.type !== 'table') return
	const t = table as TLTableShape
	const row = t.props.rows[rowIndex]
	const col = t.props.cols[colIndex]
	if (!row || !col) return

	const existing = getTableCells(editor, tableId).get(getCellKey(row.id, col.id))
	if (!text && !existing) return
	const cellId = existing ? existing.id : findOrCreateCell(editor, t, row.id, col.id)
	editor.updateShape({ id: cellId, type: 'table-cell', props: { richText: toRichText(text) } })
}

/**
 * Find the cell at `(rowId, colId)`, creating an empty, positioned one if needed.
 * New cells are born with the resolved style for their position (so header cells
 * are header-styled and overridable).
 *
 * @public
 */
export function findOrCreateCell(
	editor: Editor,
	table: TLTableShape,
	rowId: string,
	colId: string
): TLShapeId {
	const existing = getTableCells(editor, table.id).get(getCellKey(rowId, colId))
	if (existing) return existing.id

	const layout = getTableLayout(table)
	const col = layout.cols.find((c) => c.id === colId)
	const row = layout.rows.find((r) => r.id === rowId)
	const rowIndex = table.props.rows.findIndex((r) => r.id === rowId)
	const colIndex = table.props.cols.findIndex((c) => c.id === colId)
	const style = resolveCellStyle(table, rowIndex, colIndex)

	const cellId = createShapeId()
	editor.createShape<TLTableCellShape>({
		id: cellId,
		type: 'table-cell',
		parentId: table.id,
		x: col?.x ?? 0,
		y: row?.y ?? 0,
		props: { rowId, colId, kind: 'text', richText: toRichText(''), ...style },
	})
	return cellId
}

/**
 * Whether a cell is safe to garbage-collect when deselected or navigated away
 * from. Conservative: only a plain, blank `text` cell qualifies — a custom-kind
 * cell carries meaning (in `meta`) even with empty text. (Phase 5 will delegate
 * this to the kind's own `isEmpty`.)
 *
 * @public
 */
export function isCellEmpty(cell: TLTableCellShape): boolean {
	return cell.props.kind === 'text' && isEmptyRichText(cell.props.richText)
}

/**
 * Reconcile a table's cells with its skeleton: reposition every cell to its grid
 * rect, and delete orphaned cells whose row/column no longer exists (unless bound).
 * Idempotent — only writes cells whose position changed.
 *
 * @public
 */
export function reconcileTable(editor: Editor, table: TLTableShape) {
	const layout = getTableLayout(table)
	const colById = new Map(layout.cols.map((c) => [c.id, c]))
	const rowById = new Map(layout.rows.map((r) => [r.id, r]))
	const cells = getTableCells(editor, table.id)

	const updates: TLShapePartial[] = []
	const toDelete: TLShapeId[] = []

	for (const cell of cells.values()) {
		const col = colById.get(cell.props.colId)
		const row = rowById.get(cell.props.rowId)
		if (!col || !row) {
			// Orphan: keep it if something is bound to it (don't break bindings).
			if (editor.getBindingsInvolvingShape(cell.id).length === 0) toDelete.push(cell.id)
			continue
		}
		if (cell.x !== col.x || cell.y !== row.y) {
			updates.push({ id: cell.id, type: 'table-cell', x: col.x, y: row.y })
		}
	}

	if (updates.length) editor.updateShapes(updates)
	if (toDelete.length) editor.deleteShapes(toDelete)
}

/**
 * Drill-select: the first click on an unselected table selects the whole table; a
 * subsequent click selects the individual cell. (Interim — Phase 6 replaces this
 * with an editor-level container-drill policy.)
 *
 * @public
 */
export function drillSelectCell(editor: Editor, table: TLTableShape, rowId: string, colId: string) {
	const selectedIds = editor.getSelectedShapeIds()
	const onlySelected = selectedIds.length === 1 ? editor.getShape(selectedIds[0]) : undefined
	const tableSelected = onlySelected?.id === table.id
	const selectedCell =
		onlySelected && onlySelected.type === 'table-cell' && onlySelected.parentId === table.id
			? (onlySelected as TLTableCellShape)
			: undefined

	if (!tableSelected && !selectedCell) {
		editor.select(table.id)
		return
	}

	const cellId = findOrCreateCell(editor, table, rowId, colId)
	if (selectedCell && selectedCell.id !== cellId && isCellEmpty(selectedCell)) {
		editor.deleteShapes([selectedCell.id])
	}
	editor.select(cellId)
}

/**
 * Move the cell selection to the adjacent cell. Stays put at the grid edges; drops
 * the cell being left if it's still empty.
 *
 * @public
 */
export function navigateCell(
	editor: Editor,
	cell: TLTableCellShape,
	dir: 'left' | 'right' | 'up' | 'down'
) {
	const table = editor.getShape(cell.parentId)
	if (!table || table.type !== 'table') return
	const t = table as TLTableShape
	const colIndex = t.props.cols.findIndex((c) => c.id === cell.props.colId)
	const rowIndex = t.props.rows.findIndex((r) => r.id === cell.props.rowId)
	if (colIndex === -1 || rowIndex === -1) return

	let nc = colIndex
	let nr = rowIndex
	if (dir === 'left') nc = Math.max(0, colIndex - 1)
	else if (dir === 'right') nc = Math.min(t.props.cols.length - 1, colIndex + 1)
	else if (dir === 'up') nr = Math.max(0, rowIndex - 1)
	else if (dir === 'down') nr = Math.min(t.props.rows.length - 1, rowIndex + 1)
	if (nc === colIndex && nr === rowIndex) return

	const next = findOrCreateCell(editor, t, t.props.rows[nr].id, t.props.cols[nc].id)
	if (cell.id !== next && isCellEmpty(cell)) {
		editor.deleteShapes([cell.id])
	}
	editor.select(next)
}

/** Insert a new (empty) column at `atIndex`. @public */
export function insertColumn(editor: Editor, table: TLTableShape, atIndex: number) {
	const { cols } = withColumnInserted(table.props.cols, atIndex)
	editor.markHistoryStoppingPoint('insert column')
	editor.updateShape({ id: table.id, type: 'table', props: { cols } })
}

/** Delete the column at `atIndex` (a table always keeps at least one). @public */
export function deleteColumn(editor: Editor, table: TLTableShape, atIndex: number) {
	const result = withColumnRemoved(table.props.cols, atIndex)
	if (!result) return
	editor.markHistoryStoppingPoint('delete column')
	editor.updateShape({ id: table.id, type: 'table', props: { cols: result.cols } })
}

/** Insert a new (empty) row at `atIndex`. @public */
export function insertRow(editor: Editor, table: TLTableShape, atIndex: number) {
	const { rows } = withRowInserted(table.props.rows, atIndex)
	editor.markHistoryStoppingPoint('insert row')
	editor.updateShape({ id: table.id, type: 'table', props: { rows } })
}

/** Delete the row at `atIndex` (a table always keeps at least one). @public */
export function deleteRow(editor: Editor, table: TLTableShape, atIndex: number) {
	const result = withRowRemoved(table.props.rows, atIndex)
	if (!result) return
	editor.markHistoryStoppingPoint('delete row')
	editor.updateShape({ id: table.id, type: 'table', props: { rows: result.rows } })
}

/** Set the width of the column at `colIndex`, clamped to the minimum. @public */
export function setColumnWidth(
	editor: Editor,
	table: TLTableShape,
	colIndex: number,
	width: number
) {
	editor.updateShape({
		id: table.id,
		type: 'table',
		props: { cols: withColumnWidth(table.props.cols, colIndex, width) },
	})
}

/** Set the stored (minimum) height of the row at `rowIndex`. @public */
export function setRowHeight(
	editor: Editor,
	table: TLTableShape,
	rowIndex: number,
	height: number
) {
	editor.updateShape({
		id: table.id,
		type: 'table',
		props: { rows: withRowHeight(table.props.rows, rowIndex, height) },
	})
}
