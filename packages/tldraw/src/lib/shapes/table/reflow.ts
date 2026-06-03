import { Editor, TLTableShape } from '@tldraw/editor'
import { TABLE_CONSTANTS, getCellKey, getTableLayout } from './core'
import { TableCellShapeUtil } from './TableCellShapeUtil'
import { getTableCells } from './tableOperations'

/**
 * Recompute each row's auto-height from its content and store it on the table.
 *
 * Rows are auto-height: a row is as tall as its tallest cell, measured by that
 * cell's kind (`kind.measure`). The measured height is *stored* on the row, so all
 * clients read the same value — the mutating client measures and writes; the layout
 * (`getTableLayout`) just reads. Idempotent: only writes when a height changed, so
 * it converges and won't loop with the reposition reconciler.
 *
 * @public
 */
export function reflowRowHeights(editor: Editor, table: TLTableShape) {
	const cellUtil = editor.getShapeUtil('table-cell') as TableCellShapeUtil
	const cells = getTableCells(editor, table.id)
	const layout = getTableLayout(table)
	const widthByColId = new Map(layout.cols.map((c) => [c.id, c.width]))

	let changed = false
	const rows = table.props.rows.map((row) => {
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
