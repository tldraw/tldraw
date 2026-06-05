import {
	Editor,
	TLTableCellKind,
	TLTableCellKindProps,
	TLTableCellShape,
	TLTableShape,
	TableCellShapeUtil,
	Tldraw,
	createShapeId,
	diffTableStructure,
	getCellText,
	getTableLayout,
	renderPlaintextFromRichText,
	textCellKind,
	toRichText,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// A positional cell reference like "=B2" means "column B, row 2" — an *index*, not
// an identity. So when you insert or delete a row or column, every reference that
// points past the change has to shift, or it silently points at the wrong cell.
//
// The SDK can't do this rewrite itself (it doesn't own your reference syntax), but
// it ships `diffTableStructure(prev, next)`: the per-axis index maps for a
// structural edit. This example stores references as A1 text and uses that diff to
// rewrite them whenever the table's skeleton changes — the seam decision 3 in the
// design doc calls "core ships the event, the consumer owns the rewrite".

// --- A1 helpers -------------------------------------------------------------

const A1 = /^([A-Za-z]+)(\d+)$/
const REF_TOKEN = /=([A-Za-z]+\d+)/g

function colToIndex(letters: string): number {
	let n = 0
	for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
	return n - 1
}
function indexToCol(index: number): string {
	let s = ''
	let n = index + 1
	while (n > 0) {
		const r = (n - 1) % 26
		s = String.fromCharCode(65 + r) + s
		n = Math.floor((n - 1) / 26)
	}
	return s
}

// --- A reference cell kind --------------------------------------------------
// Its text is "=B2"; it displays the referenced cell's text (or #REF! if the
// target was deleted). Renders through the text cell so it inherits styling.

const refCellKind: TLTableCellKind = {
	type: 'ref',
	Component: (props: TLTableCellKindProps) => {
		const { editor, shape, table } = props

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isEditing = useValue('editing', () => editor.getEditingShapeId() === shape.id, [
			editor,
			shape.id,
		])
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const display = useValue(
			'ref-display',
			() => {
				const self = editor.getShape(shape.id) as TLTableCellShape | undefined
				if (!self) return null
				const text = renderPlaintextFromRichText(editor, self.props.richText).trim()
				const m = A1.exec(text.replace(/^=/, ''))
				if (!text.startsWith('=') || !m) return null
				const col = colToIndex(m[1])
				const row = parseInt(m[2], 10) - 1
				if (col < 0 || row < 0 || col >= table.props.cols.length || row >= table.props.rows.length)
					return '#REF!'
				return getCellText(editor, table.id, row, col)
			},
			[editor, shape.id, table]
		)

		const TextComponent = textCellKind.Component
		if (isEditing || display === null) return <TextComponent {...props} />
		const shown = { ...shape, props: { ...shape.props, richText: toRichText(display) } }
		return <TextComponent {...props} shape={shown} />
	},
}

// --- The reference-rewriting side effect ------------------------------------
// Rewrites every "=A1" reference in the table through the structural diff, so a
// reference keeps pointing at the same logical cell after inserts/deletes. A
// reference whose target row/column was deleted becomes "=#REF!".

function rewriteReferencesOnStructuralChange(editor: Editor) {
	return editor.sideEffects.registerAfterChangeHandler('shape', (prev, next) => {
		if (next.type !== 'table') return
		const change = diffTableStructure(prev as TLTableShape, next as TLTableShape)
		if (!change) return

		const nextTable = next as TLTableShape
		for (const cell of editor
			.getSortedChildIdsForParent(nextTable.id)
			.map((id) => editor.getShape(id))) {
			if (!cell || cell.type !== 'table-cell') continue
			const c = cell as TLTableCellShape
			const text = renderPlaintextFromRichText(editor, c.props.richText)
			if (!text.includes('=')) continue

			const rewritten = text.replace(REF_TOKEN, (whole, ref: string) => {
				const m = A1.exec(ref)
				if (!m) return whole
				const newCol = change.cols[colToIndex(m[1])]
				const newRow = change.rows[parseInt(m[2], 10) - 1]
				if (newCol == null || newRow == null) return '=#REF!'
				return `=${indexToCol(newCol)}${newRow + 1}`
			})
			if (rewritten !== text) {
				editor.updateShape({
					id: c.id,
					type: 'table-cell',
					props: { richText: toRichText(rewritten) },
				})
			}
		}
	})
}

const customShapeUtils = [TableCellShapeUtil.configure({ kinds: [textCellKind, refCellKind] })]

export default function TableReferencesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					rewriteReferencesOnStructuralChange(editor)
					if (editor.getCurrentPageShapeIds().size === 0) seedTable(editor)
				}}
			/>
		</div>
	)
}

function seedTable(editor: Editor) {
	const id = createShapeId()
	const cols = ['c0', 'c1', 'c2'].map((cid) => ({ id: cid, width: 130 }))
	const rows = ['r0', 'r1', 'r2', 'r3'].map((rid) => ({ id: rid }))
	editor.createShape({ id, type: 'table', x: 150, y: 150, props: { cols, rows, headerRows: 1 } })
	const layout = getTableLayout(editor.getShape(id) as TLTableShape)

	// Column C mirrors column B by reference. Insert or delete a row above row 2 and
	// watch the "=B2"/"=B3" references follow their targets instead of breaking.
	const seed: { kind: string; text: string }[][] = [
		[
			{ kind: 'text', text: 'Item' },
			{ kind: 'text', text: 'Price' },
			{ kind: 'text', text: 'Mirror of price' },
		],
		[
			{ kind: 'text', text: 'Apples' },
			{ kind: 'text', text: '3' },
			{ kind: 'ref', text: '=B2' },
		],
		[
			{ kind: 'text', text: 'Pears' },
			{ kind: 'text', text: '4' },
			{ kind: 'ref', text: '=B3' },
		],
		[
			{ kind: 'text', text: 'Plums' },
			{ kind: 'text', text: '5' },
			{ kind: 'ref', text: '=B4' },
		],
	]
	editor.createShapes(
		seed.flatMap((rowData, r) =>
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
					richText: toRichText(cell.text),
					color: 'black',
					fill: 'none',
					align: 'start',
					verticalAlign: 'middle',
				},
			}))
		)
	)
	editor.zoomToFit()
}
