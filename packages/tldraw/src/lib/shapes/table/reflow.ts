import { Editor, TLTableShape } from '@tldraw/editor'
import { TABLE_CONSTANTS, getCellKey, getTableLayout } from './core'
import { TableCellShapeUtil } from './TableCellShapeUtil'
import { getTableCells } from './tableOperations'

/**
 * Recompute table row auto-heights from content and store them on the table.
 *
 * Rows are auto-height: a row is as tall as its tallest cell, measured by that
 * cell's kind (`kind.measure`). The measured height is *stored* on the row, so all
 * clients read the same value — the mutating client measures and writes; the layout
 * (`getTableLayout`) just reads. Idempotent: only writes when a height changed, so
 * it converges and won't loop with the reposition reconciler.
 *
 * Pass `onlyRowIds` to re-measure just those rows — a content edit only changes its
 * own row's height, so the reconciler passes the edited cell's row and avoids
 * re-measuring every cell on each keystroke. Omit it to re-measure all rows (e.g.
 * after a column resize, where wrapping changes every row).
 *
 * @public
 */
export function reflowRowHeights(editor: Editor, table: TLTableShape, onlyRowIds?: Set<string>) {
	const cellUtil = editor.getShapeUtil('table-cell') as TableCellShapeUtil
	const cells = getTableCells(editor, table.id)
	const layout = getTableLayout(table)
	const widthByColId = new Map(layout.cols.map((c) => [c.id, c.width]))

	let changed = false
	const rows = table.props.rows.map((row) => {
		if (onlyRowIds && !onlyRowIds.has(row.id)) return row

		let measured: number = TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT
		for (const col of table.props.cols) {
			const cell = cells.get(getCellKey(row.id, col.id))
			if (!cell) continue
			const width = widthByColId.get(col.id) ?? TABLE_CONSTANTS.DEFAULT_COL_WIDTH
			const h = cellUtil.getKind(cell.props.kind).measure?.(editor, cell, width)
			if (h != null) measured = Math.max(measured, h)
		}
		if ((row.height ?? TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT) !== measured) {
			changed = true
			return { ...row, height: measured }
		}
		return row
	})

	if (changed) editor.updateShape({ id: table.id, type: 'table', props: { rows } })
}
