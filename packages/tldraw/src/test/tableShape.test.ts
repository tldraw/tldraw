import { Group2d, TLTableCellShape, TLTableShape, createShapeId, toRichText } from '@tldraw/editor'
import { renderToStaticMarkup } from 'react-dom/server'
import { type TLTableCellKind, textCellKind } from '../lib/shapes/table/cellKinds'
import { getCellKey, TABLE_CONSTANTS, getTableLayout } from '../lib/shapes/table/core'
import { TableCellShapeUtil } from '../lib/shapes/table/TableCellShapeUtil'
import {
	deleteColumn,
	deleteRow,
	findOrCreateCell,
	getTableCells,
	getTableData,
	insertColumn,
	insertRow,
	isCellEmpty,
	navigateCell,
	selectRow,
	setCellText,
	setRowHeight,
	tabNavigateCell,
} from '../lib/shapes/table/tableOperations'
import { TestEditor } from './TestEditor'

let editor: TestEditor
beforeEach(() => {
	editor = new TestEditor()
})

function makeTable(props: Partial<TLTableShape['props']> = {}): TLTableShape {
	const id = createShapeId()
	editor.createShape({ id, type: 'table', x: 0, y: 0, props })
	return editor.getShape(id) as TLTableShape
}
function fresh(id: TLTableShape['id']): TLTableShape {
	return editor.getShape(id) as TLTableShape
}

describe('table shape', () => {
	it('creates a 3x3 table by default', () => {
		const t = makeTable()
		expect(t.props.cols).toHaveLength(3)
		expect(t.props.rows).toHaveLength(3)
	})

	it('is a frame-like container with Group2d geometry', () => {
		const t = makeTable()
		expect(editor.getShapeUtil('table').isFrameLike(t)).toBe(true)
		const geo = editor.getShapeGeometry(t.id)
		expect(geo).toBeInstanceOf(Group2d)
		expect((geo as Group2d).children.length).toBeGreaterThan(0)
	})

	it('only accepts table-cell children and never releases them', () => {
		const t = makeTable()
		const util = editor.getShapeUtil('table')
		expect(util.canReceiveNewChildrenOfType(t, 'table-cell')).toBe(true)
		expect(util.canReceiveNewChildrenOfType(t, 'geo')).toBe(false)
		expect(util.canRemoveChildrenOfType(t, 'table-cell')).toBe(false)
	})

	it('auto-grows a row to fit content, storing the height on the record', () => {
		const t = makeTable()
		expect(getTableLayout(fresh(t.id)).rows[0].height).toBe(TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT)

		setCellText(
			editor,
			t.id,
			0,
			0,
			'one two three four five six seven eight nine ten eleven twelve thirteen fourteen'
		)

		const grown = getTableLayout(fresh(t.id)).rows[0].height
		expect(grown).toBeGreaterThan(TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT)
		// the height is stored (deterministic), not re-measured per read
		expect(fresh(t.id).props.rows[0].height).toBe(grown)
	})

	it('manual row height pins a floor that content can still grow past', () => {
		const t = makeTable()
		setRowHeight(editor, fresh(t.id), 0, 120)
		expect(getTableLayout(fresh(t.id)).rows[0].height).toBe(120)
		// the floor pushes the next row down
		expect(getTableLayout(fresh(t.id)).rows[1].y).toBe(120)
		// taller content overrides the manual floor, and the floor persists on the record
		setCellText(editor, t.id, 0, 0, 'one two three four five six seven eight '.repeat(4))
		expect(getTableLayout(fresh(t.id)).rows[0].height).toBeGreaterThan(120)
		expect(fresh(t.id).props.rows[0].manualHeight).toBe(120)
	})

	it('repositions later rows when an earlier row grows', () => {
		const t = makeTable()
		setCellText(editor, t.id, 1, 0, 'x') // row 1 has a cell
		const beforeY = getTableLayout(fresh(t.id)).rows[1].y
		setCellText(editor, t.id, 0, 0, 'a b c d e f g h i j k l m n o p q r s t u v w x y z 1 2 3 4 5')
		expect(getTableLayout(fresh(t.id)).rows[1].y).toBeGreaterThan(beforeY)
	})

	it('insertRow / deleteRow and insertColumn / deleteColumn adjust the skeleton', () => {
		const t = makeTable()
		insertRow(editor, fresh(t.id), 0)
		expect(fresh(t.id).props.rows).toHaveLength(4)
		deleteRow(editor, fresh(t.id), 0)
		expect(fresh(t.id).props.rows).toHaveLength(3)
		insertColumn(editor, fresh(t.id), 0)
		expect(fresh(t.id).props.cols).toHaveLength(4)
		deleteColumn(editor, fresh(t.id), 0)
		expect(fresh(t.id).props.cols).toHaveLength(3)
	})

	it('always keeps at least one row and column', () => {
		const t = makeTable()
		for (let i = 0; i < 5; i++) {
			deleteRow(editor, fresh(t.id), 0)
			deleteColumn(editor, fresh(t.id), 0)
		}
		expect(fresh(t.id).props.rows.length).toBeGreaterThanOrEqual(1)
		expect(fresh(t.id).props.cols.length).toBeGreaterThanOrEqual(1)
	})

	it('getTableData reads cell text as a 2D grid', () => {
		const t = makeTable()
		setCellText(editor, t.id, 0, 0, 'A')
		setCellText(editor, t.id, 1, 2, 'B')
		const data = getTableData(editor, t.id)
		expect(data).toHaveLength(3)
		expect(data[0][0]).toBe('A')
		expect(data[1][2]).toBe('B')
		expect(data[2][1]).toBe('')
	})
})

describe('selection and navigation', () => {
	it('selectRow materialises the row and selects all its cells', () => {
		const t = makeTable()
		selectRow(editor, fresh(t.id), 0)
		const selected = editor.getSelectedShapes()
		expect(selected).toHaveLength(3)
		expect(selected.every((s) => s.type === 'table-cell')).toBe(true)
	})

	it('isCellEmpty drops an unstyled blank cell but keeps a styled one', () => {
		const t = makeTable()
		const tt = fresh(t.id)
		// findOrCreateCell initialises a blank cell with the resolved default style
		const id = findOrCreateCell(editor, tt, tt.props.rows[0].id, tt.props.cols[0].id)
		// unstyled blank → collectable
		expect(isCellEmpty(editor, editor.getShape(id) as TLTableCellShape)).toBe(true)
		// a deliberate per-cell style (still blank text) → kept
		editor.updateShape({ id, type: 'table-cell', props: { color: 'blue' } })
		expect(isCellEmpty(editor, editor.getShape(id) as TLTableCellShape)).toBe(false)
	})

	it('tabNavigateCell moves forward, wraps at row ends, and stops at the edges', () => {
		const t = makeTable() // 3x3
		const tt = fresh(t.id)
		const at = (r: number, c: number) =>
			findOrCreateCell(editor, fresh(t.id), tt.props.rows[r].id, tt.props.cols[c].id)

		// forward within a row
		expect(tabNavigateCell(editor, editor.getShape(at(0, 0)) as TLTableCellShape, 'next')).toBe(
			at(0, 1)
		)
		// forward wraps from the last column to the next row's first column
		expect(tabNavigateCell(editor, editor.getShape(at(0, 2)) as TLTableCellShape, 'next')).toBe(
			at(1, 0)
		)
		// back wraps the other way
		expect(tabNavigateCell(editor, editor.getShape(at(1, 0)) as TLTableCellShape, 'prev')).toBe(
			at(0, 2)
		)
		// at the very first cell, prev has nowhere to go
		expect(
			tabNavigateCell(editor, editor.getShape(at(0, 0)) as TLTableCellShape, 'prev')
		).toBeNull()
		// at the very last cell, next has nowhere to go
		expect(
			tabNavigateCell(editor, editor.getShape(at(2, 2)) as TLTableCellShape, 'next')
		).toBeNull()
	})

	it('navigateCell moves the selection to the adjacent cell', () => {
		const t = makeTable()
		setCellText(editor, t.id, 0, 0, 'A')
		const tt = fresh(t.id)
		const start = getTableCells(editor, t.id).get(
			getCellKey(tt.props.rows[0].id, tt.props.cols[0].id)
		)!
		editor.select(start.id)
		navigateCell(editor, editor.getShape(start.id) as TLTableCellShape, 'right')
		const sel = editor.getOnlySelectedShape() as TLTableCellShape
		expect(sel?.type).toBe('table-cell')
		expect(sel.props.colId).toBe(tt.props.cols[1].id)
	})
})

describe('cell kind delegation', () => {
	// A custom kind that has no text but a meaningful value, and projects its own text.
	const checkKind: TLTableCellKind = {
		type: 'check',
		Component: () => null,
		getText: () => 'done',
		isEmpty: () => false,
	}

	it('projects cell text and decides GC through the kind', () => {
		const ed = new TestEditor({
			shapeUtils: [TableCellShapeUtil.configure({ kinds: [textCellKind, checkKind] })],
		})
		const id = createShapeId()
		ed.createShape({ id, type: 'table', x: 0, y: 0 })
		const table = ed.getShape(id) as TLTableShape
		const cellId = createShapeId()
		ed.createShape({
			id: cellId,
			type: 'table-cell',
			parentId: id,
			props: {
				rowId: table.props.rows[0].id,
				colId: table.props.cols[0].id,
				kind: 'check',
				richText: toRichText(''),
			},
		})

		// getText projection: the kind, not the (empty) rich text
		expect(getTableData(ed, id)[0][0]).toBe('done')

		// isEmpty=false → the empty-text cell survives the deselect GC
		ed.select(cellId)
		ed.selectNone()
		expect(ed.getShape(cellId)).toBeDefined()
	})
})

// Regression coverage for behaviors that are easy to break and hard to notice:
// copy/paste of the sparse cell records, bindings to a cell, and undo granularity.
describe('table shape — copy/paste, bindings, undo', () => {
	it('copy/paste round-trips the table, its cells, and their rich text', () => {
		const t = makeTable()
		setCellText(editor, t.id, 0, 0, 'hello')
		const orig = [...getTableCells(editor, t.id).values()][0]

		editor.selectAll()
		const content = editor.getContentFromCurrentPage(editor.getSelectedShapeIds())
		expect(content?.shapes.map((s) => s.type).sort()).toEqual(['table', 'table-cell'])

		editor.putContentOntoCurrentPage(content!, { point: { x: 600, y: 600 } })
		const pasted = editor
			.getCurrentPageShapes()
			.find((s) => s.type === 'table' && s.x !== 0) as TLTableShape
		expect(pasted).toBeDefined()

		const pastedCells = getTableCells(editor, pasted.id)
		expect(pastedCells.size).toBe(1)
		const pastedCell = [...pastedCells.values()][0]
		// the cell re-parents to the new table and keeps valid skeleton references
		expect(pastedCell.parentId).toBe(pasted.id)
		expect(pasted.props.rows.some((r) => r.id === pastedCell.props.rowId)).toBe(true)
		expect(pasted.props.cols.some((c) => c.id === pastedCell.props.colId)).toBe(true)
		expect(JSON.stringify(pastedCell.props.richText)).toBe(JSON.stringify(orig.props.richText))
	})

	it('a cell bound to an arrow survives the deselect GC and remaps on paste', () => {
		const t = makeTable()
		const cellId = findOrCreateCell(editor, t, t.props.rows[1].id, t.props.cols[1].id)

		const arrowId = createShapeId()
		editor.createShape({ id: arrowId, type: 'arrow', x: -200, y: -200 })
		editor.createBinding({
			type: 'arrow',
			fromId: arrowId,
			toId: cellId,
			props: {
				terminal: 'end',
				isExact: false,
				isPrecise: false,
				normalizedAnchor: { x: 0.5, y: 0.5 },
			},
		} as any)

		// a blank-but-bound cell must not be garbage-collected on deselect
		editor.select(cellId)
		editor.selectNone()
		expect(editor.getShape(cellId)).toBeDefined()

		// copy the pair; the pasted arrow binds to the pasted cell, not the original
		editor.selectAll()
		const content = editor.getContentFromCurrentPage(editor.getSelectedShapeIds())
		expect(content?.bindings?.length).toBe(1)
		editor.putContentOntoCurrentPage(content!, { point: { x: 900, y: 900 } })
		const pastedArrow = editor
			.getCurrentPageShapes()
			.find((s) => s.type === 'arrow' && s.id !== arrowId)!
		const bindings = editor.getBindingsInvolvingShape(pastedArrow.id)
		expect(bindings.length).toBe(1)
		const boundTo = editor.getShape((bindings[0] as any).toId)
		expect(boundTo?.type).toBe('table-cell')
		expect(boundTo?.id).not.toBe(cellId)
	})

	it('editing an empty cell is a single undo step that keeps the table', () => {
		const t = makeTable()
		editor.markHistoryStoppingPoint('before-edit')
		setCellText(editor, t.id, 0, 0, 'hello world')
		expect(getTableCells(editor, t.id).size).toBe(1)

		// one undo reverts cell creation + text + reflow together; the table stays
		editor.undo()
		expect(editor.getShape(t.id)).toBeDefined()
		expect(getTableCells(editor, t.id).size).toBe(0)

		editor.redo()
		expect(getTableCells(editor, t.id).size).toBe(1)
	})

	it('exports the grid chrome as native SVG vectors, not a foreign object', () => {
		const t = makeTable({ headerRows: 1 })
		const markup = renderToStaticMarkup(
			editor.getShapeUtil('table').toSvg!(t, { colorMode: 'light' } as any) as any
		)
		// header backgrounds + outer frame as <rect>, interior borders as <line>
		expect((markup.match(/<rect/g) || []).length).toBeGreaterThan(0)
		expect((markup.match(/<line/g) || []).length).toBeGreaterThan(0)
		// the whole point: no rasterizable HTML foreign object for the structure
		expect(markup).not.toContain('<foreignObject')
	})
})
