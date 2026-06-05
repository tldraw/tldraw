import {
	Editor,
	TLComponents,
	TLTableCellShape,
	TLTableShape,
	Tldraw,
	createShapeId,
	getTableLayout,
	mergeCells,
	setCellText,
	toRichText,
	unmergeCell,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Merged cells. A cell can span multiple rows and columns (rowSpan/colSpan). Drill
// into a cell, then shift-click another to select a rectangular block — a floating
// "Merge cells" button appears above the selection. Select a merged cell to get an
// "Unmerge" button. mergeCells/unmergeCell are public ops; this wires them to an
// InFrontOfTheCanvas control so the action is discoverable (a real app might use a
// context menu or toolbar button instead).

const components: TLComponents = {
	InFrontOfTheCanvas: MergeControl,
}

export default function TableMergeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) seedTable(editor)
				}}
			/>
		</div>
	)
}

function MergeControl() {
	const editor = useEditor()
	const info = useValue('merge-control', () => getMergeControl(editor), [editor])
	if (!info) return null

	return (
		<button
			onPointerDown={(e) => e.stopPropagation()}
			onClick={info.run}
			style={{
				position: 'absolute',
				transform: `translate(${info.x}px, ${info.y}px) translate(-50%, -100%)`,
				marginTop: -8,
				pointerEvents: 'all',
				padding: '4px 10px',
				border: 'none',
				borderRadius: 6,
				background: '#3b82f6',
				color: 'white',
				fontSize: 12,
				fontWeight: 600,
				cursor: 'pointer',
				whiteSpace: 'nowrap',
			}}
		>
			{info.label}
		</button>
	)
}

// Decide which control to show for the current selection: "Merge cells" for a block
// of 2+ cells in one table, "Unmerge" for a single merged cell, or nothing.
function getMergeControl(editor: Editor) {
	const cells = editor
		.getSelectedShapes()
		.filter((s): s is TLTableCellShape => s.type === 'table-cell')
	if (!cells.length) return null

	const table = editor.getShape<TLTableShape>(cells[0].parentId)
	if (table?.type !== 'table' || !cells.every((c) => c.parentId === table.id)) return null

	const bounds = editor.getSelectionPageBounds()
	if (!bounds) return null
	const vp = editor.getViewportScreenBounds()
	const top = editor.pageToScreen({ x: bounds.midX, y: bounds.minY })
	const pos = { x: top.x - vp.x, y: top.y - vp.y }

	if (cells.length >= 2) {
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
		const from = { rowId: table.props.rows[minR].id, colId: table.props.cols[minC].id }
		const to = { rowId: table.props.rows[maxR].id, colId: table.props.cols[maxC].id }
		return { ...pos, label: 'Merge cells', run: () => mergeCells(editor, table, from, to) }
	}

	const only = cells[0]
	if ((only.props.colSpan ?? 1) > 1 || (only.props.rowSpan ?? 1) > 1) {
		return { ...pos, label: 'Unmerge', run: () => unmergeCell(editor, only) }
	}
	return null
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
