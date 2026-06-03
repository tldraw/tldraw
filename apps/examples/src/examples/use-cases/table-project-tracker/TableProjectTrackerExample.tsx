import {
	Editor,
	TLTableCellKind,
	TLTableCellKindProps,
	TLTableShape,
	TableCellShapeUtil,
	Tldraw,
	createShapeId,
	getTableLayout,
	textCellKind,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// A "project tracker" showcase that puts the table together as a customer would:
// a header row, a status column rendered as a colored badge, and a done column
// rendered as a checkbox — both custom cell kinds that store their data in `meta`.

const STATUS = {
	todo: { label: 'To do', bg: '#e7e7ea', fg: '#444' },
	doing: { label: 'In progress', bg: '#fff0c2', fg: '#8a6d00' },
	done: { label: 'Done', bg: '#d6f5d6', fg: '#1c7c1c' },
} as const

const statusCellKind: TLTableCellKind = {
	type: 'status',
	Component: ({ shape, width, height }: TLTableCellKindProps) => {
		const s = STATUS[(shape.meta.value as keyof typeof STATUS) ?? 'todo'] ?? STATUS.todo
		return (
			<div style={{ width, height, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
				<span
					style={{
						background: s.bg,
						color: s.fg,
						borderRadius: 999,
						padding: '2px 10px',
						fontSize: 13,
						fontWeight: 600,
					}}
				>
					{s.label}
				</span>
			</div>
		)
	},
}

const checkboxCellKind: TLTableCellKind = {
	type: 'checkbox',
	Component: ({ shape, width, height }: TLTableCellKindProps) => (
		<div
			style={{
				width,
				height,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 20,
			}}
		>
			{shape.meta.value === true ? '☑' : '☐'}
		</div>
	),
}

const customShapeUtils = [
	TableCellShapeUtil.configure({ kinds: [textCellKind, statusCellKind, checkboxCellKind] }),
]

export default function TableProjectTrackerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) seedTracker(editor)
				}}
			/>
		</div>
	)
}

interface Seed {
	kind: string
	text?: string
	value?: unknown
}

function seedTracker(editor: Editor) {
	const id = createShapeId()
	const cols = [160, 120, 140, 80].map((width, i) => ({ id: `c${i}`, width }))
	const rows = ['r0', 'r1', 'r2', 'r3'].map((rid) => ({ id: rid }))
	editor.createShape({ id, type: 'table', x: 120, y: 120, props: { cols, rows, headerRows: 1 } })
	const layout = getTableLayout(editor.getShape(id) as TLTableShape)

	const grid: Seed[][] = [
		[
			{ kind: 'text', text: 'Task' },
			{ kind: 'text', text: 'Owner' },
			{ kind: 'text', text: 'Status' },
			{ kind: 'text', text: 'Done' },
		],
		[
			{ kind: 'text', text: 'Ship table shape' },
			{ kind: 'text', text: 'Ada' },
			{ kind: 'status', value: 'done' },
			{ kind: 'checkbox', value: true },
		],
		[
			{ kind: 'text', text: 'Write the docs' },
			{ kind: 'text', text: 'Grace' },
			{ kind: 'status', value: 'doing' },
			{ kind: 'checkbox', value: false },
		],
		[
			{ kind: 'text', text: 'Add CSV export' },
			{ kind: 'text', text: 'Alan' },
			{ kind: 'status', value: 'todo' },
			{ kind: 'checkbox', value: false },
		],
	]
	editor.createShapes(
		grid.flatMap((rowData, r) =>
			rowData.map((cell, c) => ({
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
					align: (c === 3 ? 'middle' : 'start') as 'middle' | 'start',
					verticalAlign: 'middle' as const,
				},
				meta: cell.value !== undefined ? { value: cell.value } : {},
			}))
		)
	)
	editor.zoomToFit()
}
