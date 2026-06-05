import {
	Editor,
	TLShapeId,
	TLShapePartial,
	TLTableCellShape,
	TLTableShape,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { renderPlaintextFromRichText } from '../../utils/text/richText'
import {
	getCellAtPoint,
	getCellKey,
	getCellsInRange,
	getMergeMap,
	getTableLayout,
	resolveCellStyle,
	withColumnInserted,
	withColumnRemoved,
	withColumnWidth,
	withRowHeight,
	withRowInserted,
	withRowRemoved,
} from './core'
import type { TableCellShapeUtil } from './TableCellShapeUtil'

/** Resolve a cell's registered kind via the cell util's registry. */
function kindFor(editor: Editor, cell: TLTableCellShape) {
	return (editor.getShapeUtil('table-cell') as TableCellShapeUtil).getKind(cell.props.kind)
}

/** Plain-text projection of a cell, via its kind (defaults to its rich text). */
function cellText(editor: Editor, cell: TLTableCellShape): string {
	const kind = kindFor(editor, cell)
	return kind.getText
		? kind.getText(editor, cell)
		: renderPlaintextFromRichText(editor, cell.props.richText)
}

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
			return cell ? cellText(editor, cell) : ''
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
	return cell ? cellText(editor, cell) : ''
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
 * from. Delegated to the cell's kind: the text kind reports empty rich text; a
 * custom kind decides for itself (and, with no `isEmpty`, is never collected — it
 * carries meaning in `meta` even with empty text).
 *
 * @public
 */
export function isCellEmpty(editor: Editor, cell: TLTableCellShape): boolean {
	const kind = kindFor(editor, cell)
	return kind.isEmpty ? kind.isEmpty(editor, cell) : false
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

	// Materialise + reselect (and drop the cell we left, if empty) as one transaction.
	editor.run(() => {
		const cellId = findOrCreateCell(editor, table, rowId, colId)
		if (selectedCell && selectedCell.id !== cellId && isCellEmpty(editor, selectedCell)) {
			editor.deleteShapes([selectedCell.id])
		}
		editor.select(cellId)
	})
}

/**
 * Select every cell in the rectangular block between two corner cells, materialising
 * any that don't exist yet. The block is bulk-stylable (the style panel applies to
 * all selected cells) and bulk-clearable (delete the selection). Order-independent.
 *
 * @public
 */
export function selectCellRange(
	editor: Editor,
	table: TLTableShape,
	from: { rowId: string; colId: string },
	to: { rowId: string; colId: string }
) {
	editor.run(() => {
		const ids = getCellsInRange(table, from, to).map(({ rowId, colId }) =>
			findOrCreateCell(editor, table, rowId, colId)
		)
		if (ids.length) editor.select(...ids)
	})
}

/**
 * The anchor cell for a shift-click range extension: the top-left (lowest row, then
 * column) of the cells currently selected in this table, or `null` if none are. Used
 * so a shift-click selects the block from the existing selection to the clicked cell.
 *
 * @internal
 */
export function getRangeAnchorCell(
	editor: Editor,
	table: TLTableShape
): { rowId: string; colId: string } | null {
	const rowOrder = new Map(table.props.rows.map((r, i) => [r.id, i]))
	const colOrder = new Map(table.props.cols.map((c, i) => [c.id, i]))
	let best: { rowId: string; colId: string; rank: number } | null = null
	for (const id of editor.getSelectedShapeIds()) {
		const cell = editor.getShape(id)
		if (!cell || cell.type !== 'table-cell' || cell.parentId !== table.id) continue
		const c = cell as TLTableCellShape
		const r = rowOrder.get(c.props.rowId)
		const col = colOrder.get(c.props.colId)
		if (r === undefined || col === undefined) continue
		const rank = r * table.props.cols.length + col
		if (!best || rank < best.rank) best = { rowId: c.props.rowId, colId: c.props.colId, rank }
	}
	return best ? { rowId: best.rowId, colId: best.colId } : null
}

/**
 * The cell at a point in the table's local space, resolving a hit on a position
 * covered by a merged cell to that merged cell's anchor. Returns `null` outside
 * the grid. Use this (not the raw `getCellAtPoint`) when selecting or editing, so
 * a click inside a merged cell targets the anchor rather than a hidden position.
 *
 * @public
 */
export function getMergedCellAtPoint(
	editor: Editor,
	table: TLTableShape,
	x: number,
	y: number
): { rowId: string; colId: string } | null {
	const hit = getCellAtPoint(getTableLayout(table), x, y)
	if (!hit) return null
	const merge = getMergeMap(table, getTableCells(editor, table.id).values())
	const anchorKey = merge.covered.get(getCellKey(hit.rowId, hit.colId))
	const anchor = anchorKey ? merge.anchors.get(anchorKey) : undefined
	return anchor ? { rowId: anchor.rowId, colId: anchor.colId } : hit
}

/**
 * Merge the rectangular block between two corner cells into a single cell anchored
 * at its top-left. Sets the anchor's `rowSpan`/`colSpan`, deletes the now-covered
 * cell records, and selects the anchor. A 1×1 block is a no-op. Bound covered cells
 * are kept (so bindings don't break), but still hidden under the span.
 *
 * @public
 */
export function mergeCells(
	editor: Editor,
	table: TLTableShape,
	from: { rowId: string; colId: string },
	to: { rowId: string; colId: string }
) {
	const rowOf = (id: string) => table.props.rows.findIndex((r) => r.id === id)
	const colOf = (id: string) => table.props.cols.findIndex((c) => c.id === id)
	const r1 = rowOf(from.rowId)
	const r2 = rowOf(to.rowId)
	const c1 = colOf(from.colId)
	const c2 = colOf(to.colId)
	if (r1 === -1 || r2 === -1 || c1 === -1 || c2 === -1) return

	const minR = Math.min(r1, r2)
	const maxR = Math.max(r1, r2)
	const minC = Math.min(c1, c2)
	const maxC = Math.max(c1, c2)
	const rowSpan = maxR - minR + 1
	const colSpan = maxC - minC + 1
	if (rowSpan === 1 && colSpan === 1) return

	const anchorRowId = table.props.rows[minR].id
	const anchorColId = table.props.cols[minC].id

	editor.run(() => {
		const anchorId = findOrCreateCell(editor, table, anchorRowId, anchorColId)
		const cells = getTableCells(editor, table.id)
		const toDelete: TLShapeId[] = []
		for (const { rowId, colId } of getCellsInRange(table, from, to)) {
			if (rowId === anchorRowId && colId === anchorColId) continue
			const covered = cells.get(getCellKey(rowId, colId))
			// Keep a covered cell that something is bound to, to avoid breaking bindings.
			if (covered && editor.getBindingsInvolvingShape(covered.id).length === 0) {
				toDelete.push(covered.id)
			}
		}
		if (toDelete.length) editor.deleteShapes(toDelete)
		editor.updateShape({ id: anchorId, type: 'table-cell', props: { rowSpan, colSpan } })
		editor.select(anchorId)
	})
}

/**
 * Unmerge a previously merged cell, resetting its span to 1×1. The positions it
 * covered become empty cells again. No-op for an unmerged cell.
 *
 * @public
 */
export function unmergeCell(editor: Editor, cell: TLTableCellShape) {
	if ((cell.props.colSpan ?? 1) === 1 && (cell.props.rowSpan ?? 1) === 1) return
	editor.updateShape({ id: cell.id, type: 'table-cell', props: { rowSpan: 1, colSpan: 1 } })
}

/**
 * Select every cell in a row. Empty cells are materialised first (per the design
 * decision to densify a row on selection), so the whole row becomes real, styleable
 * cells — set a fill/color in the style panel to restyle the row at once.
 *
 * @public
 */
export function selectRow(editor: Editor, table: TLTableShape, rowIndex: number) {
	const row = table.props.rows[rowIndex]
	if (!row) return
	editor.run(() => {
		const ids = table.props.cols.map((col) => findOrCreateCell(editor, table, row.id, col.id))
		if (ids.length) editor.select(...ids)
	})
}

/**
 * Select every cell in a column, materialising empty cells first. See {@link selectRow}.
 *
 * @public
 */
export function selectColumn(editor: Editor, table: TLTableShape, colIndex: number) {
	const col = table.props.cols[colIndex]
	if (!col) return
	editor.run(() => {
		const ids = table.props.rows.map((row) => findOrCreateCell(editor, table, row.id, col.id))
		if (ids.length) editor.select(...ids)
	})
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

	editor.run(() => {
		const next = findOrCreateCell(editor, t, t.props.rows[nr].id, t.props.cols[nc].id)
		if (cell.id !== next && isCellEmpty(editor, cell)) {
			editor.deleteShapes([cell.id])
		}
		editor.select(next)
	})
}

/**
 * Move the cell selection one cell forward (`next`) or backward (`prev`) in
 * row-major order, wrapping across row boundaries — the Tab / Shift+Tab idiom.
 * Stops at the first/last cell of the table. Drops the cell being left if it's
 * still empty. Returns the id of the cell moved to, or `null` if there was
 * nowhere to go (already at the edge). Unlike {@link navigateCell}, this is meant
 * to run while a cell is being edited, so callers can re-enter editing on the
 * returned cell.
 *
 * @public
 */
export function tabNavigateCell(
	editor: Editor,
	cell: TLTableCellShape,
	dir: 'next' | 'prev'
): TLShapeId | null {
	const table = editor.getShape(cell.parentId)
	if (!table || table.type !== 'table') return null
	const t = table as TLTableShape
	const cols = t.props.cols
	const rows = t.props.rows
	const colIndex = cols.findIndex((c) => c.id === cell.props.colId)
	const rowIndex = rows.findIndex((r) => r.id === cell.props.rowId)
	if (colIndex === -1 || rowIndex === -1) return null

	const flat = rowIndex * cols.length + colIndex + (dir === 'next' ? 1 : -1)
	if (flat < 0 || flat >= cols.length * rows.length) return null // at the table edge
	const nr = Math.floor(flat / cols.length)
	const nc = flat % cols.length

	let next!: TLShapeId
	editor.run(() => {
		next = findOrCreateCell(editor, t, rows[nr].id, cols[nc].id)
		if (cell.id !== next && isCellEmpty(editor, cell)) {
			editor.deleteShapes([cell.id])
		}
		editor.select(next)
	})
	return next
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
