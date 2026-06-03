import { type CSSProperties } from 'react'
import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	TLComponents,
	TLTableCellKind,
	TLTableCellKindProps,
	TLTableCellShape,
	TLTableShape,
	TLUiContextMenuProps,
	TableCellShapeUtil,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	createShapeId,
	getTableLayout,
	textCellKind,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Custom cell kinds via the registry. A kind controls how a cell of that `kind`
// renders; register them with TableCellShapeUtil.configure({ kinds: [...] }) and
// pass the configured util to <Tldraw shapeUtils>. Custom kinds store their data in
// the cell's `meta` (a plain JsonObject), not a typed prop.

// A boolean checkbox cell, stored in the cell's `meta.value`.
const checkboxCellKind: TLTableCellKind = {
	type: 'checkbox',
	Component: ({ shape, width, height }: TLTableCellKindProps) => (
		<div style={centered(width, height)}>{shape.meta.value === true ? '☑' : '☐'}</div>
	),
}

// A 0–5 star rating cell, stored as a number in `meta.value`.
const ratingCellKind: TLTableCellKind = {
	type: 'rating',
	Component: ({ shape, width, height }: TLTableCellKindProps) => {
		const n = Math.max(0, Math.min(5, Number(shape.meta.value) || 0))
		return (
			<div style={{ ...centered(width, height), letterSpacing: 2 }}>
				{'★'.repeat(n)}
				{'☆'.repeat(5 - n)}
			</div>
		)
	},
}

function centered(width: number, height: number): CSSProperties {
	return {
		width,
		height,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontSize: 20,
	}
}

const customShapeUtils = [
	TableCellShapeUtil.configure({ kinds: [textCellKind, checkboxCellKind, ratingCellKind] }),
]

const components: TLComponents = {
	// Right-click a single selected cell to change its value.
	ContextMenu: (props: TLUiContextMenuProps) => {
		const editor = useEditor()
		const cellId = useValue(
			'cell-id',
			() => {
				const s = editor.getOnlySelectedShape()
				return s?.type === 'table-cell' ? s.id : null
			},
			[editor]
		)
		const cell = () => (cellId ? (editor.getShape(cellId) as TLTableCellShape) : null)
		return (
			<DefaultContextMenu {...props}>
				{cellId && (
					<TldrawUiMenuGroup id="cell">
						<TldrawUiMenuItem
							id="toggle-checkbox"
							label="Toggle checkbox value"
							onSelect={() => {
								const c = cell()
								if (c) setValue(editor, c.id, c.meta.value !== true)
							}}
						/>
						<TldrawUiMenuItem
							id="bump-rating"
							label="Bump rating (+1, wraps)"
							onSelect={() => {
								const c = cell()
								if (c) setValue(editor, c.id, ((Number(c.meta.value) || 0) + 1) % 6)
							}}
						/>
					</TldrawUiMenuGroup>
				)}
				<DefaultContextMenuContent />
			</DefaultContextMenu>
		)
	},
}

export default function TableCustomCellsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) seedTable(editor)
				}}
			/>
		</div>
	)
}

function setValue(editor: Editor, id: TLTableCellShape['id'], value: unknown) {
	editor.updateShape({ id, type: 'table-cell', meta: { ...editor.getShape(id)?.meta, value } })
}

interface Seed {
	kind: string
	text?: string
	value?: unknown
}

function seedTable(editor: Editor) {
	const id = createShapeId()
	editor.createShape({ id, type: 'table', x: 150, y: 150, props: { headerRows: 1 } })
	const table = editor.getShape(id) as TLTableShape
	const { rows, cols } = table.props
	const layout = getTableLayout(table)

	// [text, checkbox, rating] per column
	const seed: Seed[][] = [
		[
			{ kind: 'text', text: 'Task' },
			{ kind: 'text', text: 'Done' },
			{ kind: 'text', text: 'Rating' },
		],
		[
			{ kind: 'text', text: 'Ship tables' },
			{ kind: 'checkbox', value: true },
			{ kind: 'rating', value: 5 },
		],
		[
			{ kind: 'text', text: 'Write docs' },
			{ kind: 'checkbox', value: false },
			{ kind: 'rating', value: 3 },
		],
	]
	editor.createShapes(
		seed.flatMap((rowData, r) =>
			rowData.flatMap((cell, c) =>
				rows[r] && cols[c]
					? [
							{
								id: createShapeId(),
								type: 'table-cell' as const,
								parentId: id,
								x: layout.cols[c].x,
								y: layout.rows[r].y,
								props: {
									rowId: rows[r].id,
									colId: cols[c].id,
									kind: cell.kind,
									richText: toRichText(cell.text ?? ''),
									color: 'black' as const,
									fill: 'none' as const,
									align: 'start' as const,
									verticalAlign: 'middle' as const,
								},
								meta: cell.value !== undefined ? { value: cell.value } : {},
							},
						]
					: []
			)
		)
	)
	editor.zoomToFit()
}
