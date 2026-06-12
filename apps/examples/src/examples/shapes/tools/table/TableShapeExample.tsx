import {
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	createShapeId,
	setCellText,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

// The table shape is a default shape. This example surfaces the table tool in the
// toolbar and seeds a small table with a header row. Click a table to select it,
// click again to drill into a cell, and double-click to edit. Drag the interior
// edges to resize a column/row, or the selection corners to scale the whole table.

const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.table = {
			id: 'table',
			icon: 'tool-frame',
			label: 'Table',
			kbd: 'shift+t',
			onSelect: () => editor.setCurrentTool('table'),
		}
		return tools
	},
}

const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSelected = useIsToolSelected(tools['table'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['table']} isSelected={isSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

export default function TableShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				overrides={uiOverrides}
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) seedTable(editor)
				}}
			/>
		</div>
	)
}

function seedTable(editor: Editor) {
	const id = createShapeId()
	editor.createShape({ id, type: 'table', x: 150, y: 150, props: { headerRows: 1 } })
	const data = [
		['Item', 'Qty', 'Price'],
		['Apples', '6', '1.2'],
		['Pears', '3', '0.8'],
	]
	data.forEach((row, r) => row.forEach((text, c) => setCellText(editor, id, r, c, text)))
	editor.zoomToFit()
}
