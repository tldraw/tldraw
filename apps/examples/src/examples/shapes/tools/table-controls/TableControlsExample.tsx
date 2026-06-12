import {
	Editor,
	TLComponents,
	TLShapeId,
	TLTableShape,
	Tldraw,
	createShapeId,
	getTableLayout,
	insertColumn,
	insertRow,
	selectColumn,
	selectRow,
	setCellText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// FigJam-style table controls, built from public SDK APIs. Select a table (or any
// of its cells) to reveal: a strip beside each row/column that selects the whole
// row/column, and "+" bars to add a row or column. All from public helpers —
// getTableLayout for geometry, pageToScreen + InFrontOfTheCanvas to place screen-
// space UI, and selectRow/selectColumn + insertRow/insertColumn for the actions.
//
// Tip: click a row strip to select (and materialise) the row, then set a fill in
// the style panel to restyle the whole row — header included.

const GUTTER = 16

const components: TLComponents = {
	InFrontOfTheCanvas: TableControls,
}

export default function TableControlsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) seedTable(editor)
				}}
				components={components}
			/>
		</div>
	)
}

function TableControls() {
	const editor = useEditor()
	const info = useValue(
		'table-controls',
		() => {
			const tableId = activeTableId(editor)
			if (!tableId) return null
			const table = editor.getShape(tableId)
			if (table?.type !== 'table') return null
			const bounds = editor.getShapePageBounds(tableId)
			if (!bounds) return null
			const layout = getTableLayout(table as TLTableShape)
			const vp = editor.getViewportScreenBounds()
			const origin = editor.pageToScreen({ x: bounds.x, y: bounds.y })
			return { tableId, layout, z: editor.getZoomLevel(), ox: origin.x - vp.x, oy: origin.y - vp.y }
		},
		[editor]
	)

	if (!info) return null
	const { tableId, layout, z, ox, oy } = info
	const W = layout.width * z
	const H = layout.height * z
	const withTable = (fn: (t: TLTableShape) => void) => {
		const t = editor.getShape(tableId)
		if (t?.type === 'table') fn(t as TLTableShape)
	}

	return (
		<>
			{layout.rows.map((r) => (
				<Strip
					key={`row:${r.id}`}
					x={ox - GUTTER}
					y={oy + r.y * z}
					w={GUTTER - 3}
					h={r.height * z - 2}
					title="Select row"
					onClick={() => withTable((t) => selectRow(editor, t, r.index))}
				/>
			))}
			{layout.cols.map((c) => (
				<Strip
					key={`col:${c.id}`}
					x={ox + c.x * z}
					y={oy - GUTTER}
					w={c.width * z - 2}
					h={GUTTER - 3}
					title="Select column"
					onClick={() => withTable((t) => selectColumn(editor, t, c.index))}
				/>
			))}
			<PlusBar
				x={ox}
				y={oy + H + 4}
				w={W}
				h={16}
				title="Add row"
				onClick={() => withTable((t) => insertRow(editor, t, t.props.rows.length))}
			/>
			<PlusBar
				x={ox + W + 4}
				y={oy}
				w={16}
				h={H}
				title="Add column"
				onClick={() => withTable((t) => insertColumn(editor, t, t.props.cols.length))}
			/>
		</>
	)
}

interface BarProps {
	x: number
	y: number
	w: number
	h: number
	title: string
	onClick(): void
}

function Strip({ x, y, w, h, title, onClick }: BarProps) {
	return (
		<button
			title={title}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={onClick}
			style={{
				position: 'absolute',
				transform: `translate(${x}px, ${y}px)`,
				width: Math.max(w, 0),
				height: Math.max(h, 0),
				pointerEvents: 'all',
				padding: 0,
				border: 'none',
				borderRadius: 4,
				background: 'rgba(59, 130, 246, 0.25)',
				cursor: 'pointer',
			}}
		/>
	)
}

function PlusBar({ x, y, w, h, title, onClick }: BarProps) {
	return (
		<button
			title={title}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={onClick}
			style={{
				position: 'absolute',
				transform: `translate(${x}px, ${y}px)`,
				width: Math.max(w, 0),
				height: Math.max(h, 0),
				pointerEvents: 'all',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				border: 'none',
				borderRadius: 6,
				background: '#3b82f6',
				color: 'white',
				fontSize: 16,
				fontWeight: 700,
				lineHeight: 1,
				cursor: 'pointer',
			}}
		>
			+
		</button>
	)
}

// The single table common to the whole selection — so affordances stay visible
// after a row/column selection (which selects multiple cells).
function activeTableId(editor: Editor): TLShapeId | null {
	const ids = editor.getSelectedShapeIds()
	if (!ids.length) return null
	let tableId: TLShapeId | null = null
	for (const id of ids) {
		const shape = editor.getShape(id)
		const tid =
			shape?.type === 'table' ? shape.id : shape?.type === 'table-cell' ? shape.parentId : null
		if (!tid) return null
		if (tableId && tableId !== tid) return null
		tableId = tid as TLShapeId
	}
	return tableId
}

function seedTable(editor: Editor) {
	const id = createShapeId()
	editor.createShape({ id, type: 'table', x: 220, y: 200, props: { headerRows: 1 } })
	const data = [
		['Item', 'Qty', 'Price'],
		['Apples', '6', '1.2'],
		['Pears', '3', '0.8'],
	]
	data.forEach((row, r) => row.forEach((text, c) => setCellText(editor, id, r, c, text)))
	editor.zoomToFit()
}
