import { Group2d, TLTableShape, createShapeId, toRichText } from '@tldraw/editor'
import { type TLTableCellKind, textCellKind } from '../lib/shapes/table/cellKinds'
import { TABLE_CONSTANTS, getTableLayout } from '../lib/shapes/table/core'
import { TableCellShapeUtil } from '../lib/shapes/table/TableCellShapeUtil'
import {
	deleteColumn,
	deleteRow,
	getTableData,
	insertColumn,
	insertRow,
	setCellText,
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
