import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	TLComponents,
	TLTableShape,
	TLUiContextMenuProps,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	createShapeId,
	setCellText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Styling a table:
//
// - Click a table, then click a cell to drill into it. Every style is per-cell —
//   the style panel sets the cell's color, fill, font, size and alignment.
// - Header cells are shaded by default but fully restyleable: drill into a header
//   cell (or select the header row) and change its fill — the header style yields
//   to your own.
// - Border visibility is a plain `borders` prop (not a style), so apps decide
//   whether to expose it — here a context-menu toggle.

const components: TLComponents = {
	ContextMenu: (props: TLUiContextMenuProps) => {
		const editor = useEditor()
		const tableId = useValue('table-id', () => selectedTableId(editor), [editor])
		return (
			<DefaultContextMenu {...props}>
				{tableId && (
					<TldrawUiMenuGroup id="table">
						<TldrawUiMenuItem
							id="toggle-borders"
							label="Toggle borders"
							onSelect={() => {
								const t = editor.getShape(tableId) as TLTableShape
								editor.updateShape({
									id: t.id,
									type: 'table',
									props: { borders: t.props.borders === 'none' ? 'all' : 'none' },
								})
							}}
						/>
					</TldrawUiMenuGroup>
				)}
				<DefaultContextMenuContent />
			</DefaultContextMenu>
		)
	},
}

export default function TableStylingExample() {
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

function selectedTableId(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	if (shape?.type === 'table') return shape.id
	if (shape?.type === 'table-cell') {
		const parent = editor.getShape(shape.parentId)
		if (parent?.type === 'table') return parent.id
	}
	return null
}

function seedTable(editor: Editor) {
	const id = createShapeId()
	editor.createShape({ id, type: 'table', x: 150, y: 150, props: { headerRows: 1 } })
	const data = [
		['Status', 'Owner', 'Priority'],
		['Blocked', 'Ada', 'High'],
		['Done', 'Grace', 'Low'],
	]
	data.forEach((row, r) => row.forEach((text, c) => setCellText(editor, id, r, c, text)))
	editor.zoomToFit()
}
