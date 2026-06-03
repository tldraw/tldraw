import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	TLComponents,
	TLShapeId,
	TLTableCellShape,
	TLTableShape,
	TLUiContextMenuProps,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	createShapeId,
	deleteColumn,
	deleteRow,
	insertColumn,
	insertRow,
	setCellText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Structural editing via the context menu. Right-click a table (or drill into a
// cell first) for insert / delete row & column. Deletes target the selected cell's
// row/column when a cell is selected, else the last one. Drag a column's interior
// edge to resize it; rows are auto-height and fit their content.

const components: TLComponents = {
	ContextMenu: (props: TLUiContextMenuProps) => {
		const editor = useEditor()
		const target = useValue('structural-target', () => structuralTarget(editor), [editor])
		const withTable = (fn: (table: TLTableShape) => void) => {
			if (!target) return
			const table = editor.getShape(target.tableId)
			if (table?.type === 'table') fn(table as TLTableShape)
		}
		return (
			<DefaultContextMenu {...props}>
				{target && (
					<TldrawUiMenuGroup id="table-structure">
						<TldrawUiMenuItem
							id="insert-row"
							label="Insert row below"
							onSelect={() =>
								withTable((t) =>
									insertRow(editor, t, target.row != null ? target.row + 1 : t.props.rows.length)
								)
							}
						/>
						<TldrawUiMenuItem
							id="insert-column"
							label="Insert column right"
							onSelect={() =>
								withTable((t) =>
									insertColumn(editor, t, target.col != null ? target.col + 1 : t.props.cols.length)
								)
							}
						/>
						<TldrawUiMenuItem
							id="delete-row"
							label="Delete row"
							onSelect={() =>
								withTable((t) =>
									deleteRow(editor, t, target.row != null ? target.row : t.props.rows.length - 1)
								)
							}
						/>
						<TldrawUiMenuItem
							id="delete-column"
							label="Delete column"
							onSelect={() =>
								withTable((t) =>
									deleteColumn(editor, t, target.col != null ? target.col : t.props.cols.length - 1)
								)
							}
						/>
					</TldrawUiMenuGroup>
				)}
				<DefaultContextMenuContent />
			</DefaultContextMenu>
		)
	},
}

export default function TableStructureExample() {
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

function structuralTarget(
	editor: Editor
): { tableId: TLShapeId; row: number | null; col: number | null } | null {
	const shape = editor.getOnlySelectedShape()
	if (shape?.type === 'table') return { tableId: shape.id, row: null, col: null }
	if (shape?.type === 'table-cell') {
		const cell = shape as TLTableCellShape
		const parent = editor.getShape(cell.parentId)
		if (parent?.type === 'table') {
			const t = parent as TLTableShape
			const row = t.props.rows.findIndex((r) => r.id === cell.props.rowId)
			const col = t.props.cols.findIndex((c) => c.id === cell.props.colId)
			return { tableId: t.id, row: row < 0 ? null : row, col: col < 0 ? null : col }
		}
	}
	return null
}

function seedTable(editor: Editor) {
	const id = createShapeId()
	editor.createShape({ id, type: 'table', x: 150, y: 150, props: { headerRows: 1 } })
	const data = [
		['Task', 'Owner', 'Notes'],
		['Design', 'Ada', 'In review'],
		['Build', 'Grace', 'Started'],
	]
	data.forEach((row, r) => row.forEach((text, c) => setCellText(editor, id, r, c, text)))
	editor.zoomToFit()
}
