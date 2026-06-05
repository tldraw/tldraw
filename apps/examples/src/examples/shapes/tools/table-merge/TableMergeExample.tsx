import {
	Editor,
	TLTableCellShape,
	TLTableShape,
	Tldraw,
	createShapeId,
	getTableLayout,
	mergeCells,
	setCellText,
	toRichText,
	unmergeCell,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Merged cells. Shift-click across a block of cells to select a rectangular range,
// then press "m" to merge it into a single cell (or "u" to unmerge the selected
// cell). mergeCells/unmergeCell are public ops; this example just wires them to
// keys — you'd bind them to a toolbar button or context menu in a real app.

function mergeSelection(editor: Editor) {
	const cells = editor
		.getSelectedShapes()
		.filter((s): s is TLTableCellShape => s.type === 'table-cell')
	if (cells.length < 2) return
	const table = editor.getShape(cells[0].parentId) as TLTableShape | undefined
	if (table?.type !== 'table') return

	// The selection's bounding corners, by row/column index.
	const rowOf = (id: string) => table.props.rows.findIndex((r) => r.id === id)
	const colOf = (id: string) => table.props.cols.findIndex((c) => c.id === id)
	let minR = Infinity
	let maxR = -Infinity
	let minC = Infinity
	let maxC = -Infinity
	for (const cell of cells) {
		minR = Math.min(minR, rowOf(cell.props.rowId))
		maxR = Math.max(maxR, rowOf(cell.props.rowId))
		minC = Math.min(minC, colOf(cell.props.colId))
		maxC = Math.max(maxC, colOf(cell.props.colId))
	}
	mergeCells(
		editor,
		table,
		{ rowId: table.props.rows[minR].id, colId: table.props.cols[minC].id },
		{ rowId: table.props.rows[maxR].id, colId: table.props.cols[maxC].id }
	)
}

function unmergeSelection(editor: Editor) {
	const cell = editor.getOnlySelectedShape()
	if (cell?.type === 'table-cell') unmergeCell(editor, cell as TLTableCellShape)
}

export default function TableMergeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) seedTable(editor)

					const onKeyDown = (e: KeyboardEvent) => {
						if (editor.getEditingShapeId()) return
						if (e.key === 'm') mergeSelection(editor)
						if (e.key === 'u') unmergeSelection(editor)
					}
					const container = editor.getContainer()
					container.addEventListener('keydown', onKeyDown)
					editor.disposables.add(() => container.removeEventListener('keydown', onKeyDown))
				}}
			/>
		</div>
	)
}

function seedTable(editor: Editor) {
	const id = createShapeId()
	const cols = ['c0', 'c1', 'c2', 'c3'].map((cid) => ({ id: cid, width: 120 }))
	const rows = ['r0', 'r1', 'r2', 'r3'].map((rid) => ({ id: rid }))
	editor.createShape({ id, type: 'table', x: 150, y: 150, props: { cols, rows, headerRows: 1 } })
	const layout = getTableLayout(editor.getShape(id) as TLTableShape)

	const seed = [
		['Quarter', 'Q1', 'Q2', 'Q3'],
		['Revenue', '120', '140', '160'],
		['Costs', '80', '90', '95'],
		['Notes', '', '', ''],
	]
	editor.createShapes(
		seed.flatMap((rowData, r) =>
			rowData
				.map((text, c) => ({ text, r, c }))
				.filter(({ text }) => text !== '')
				.map(({ text, r, c }) => ({
					id: createShapeId(),
					type: 'table-cell' as const,
					parentId: id,
					x: layout.cols[c].x,
					y: layout.rows[r].y,
					props: {
						rowId: rows[r].id,
						colId: cols[c].id,
						kind: 'text',
						richText: toRichText(text),
						color: 'black' as const,
						fill: 'none' as const,
						align: 'start' as const,
						verticalAlign: 'middle' as const,
					},
				}))
		)
	)
	// Pre-merge the "Notes" row's three empty cells into one wide cell, then label it.
	const table = editor.getShape(id) as TLTableShape
	mergeCells(editor, table, { rowId: 'r3', colId: 'c1' }, { rowId: 'r3', colId: 'c3' })
	setCellText(editor, id, 3, 1, 'On track for the year')
	editor.selectNone()
	editor.zoomToFit()
}
