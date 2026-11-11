import { TLTableShape, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import {
	appendTableColumn,
	appendTableRow,
	createTableShapeProps,
	getSortedTableColumns,
	getSortedTableRows,
	insertTableColumn,
	insertTableRow,
	removeTableColumn,
	removeTableRow,
	setTableCellText,
} from './tableHelpers'

let editor: TestEditor

const id = createShapeId('table')

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

function createTable(data: string[][]) {
	editor.createShape<TLTableShape>({ id, type: 'table', props: createTableShapeProps(data) })
	return editor.getShape<TLTableShape>(id)!
}

function getCellGrid(shape: TLTableShape) {
	return getSortedTableRows(shape.props).map((row) =>
		getSortedTableColumns(shape.props).map(
			(column) => shape.props.cells[row.id]?.[column.id]?.text ?? ''
		)
	)
}

describe('TableShapeUtil', () => {
	it('creates a table from rows of strings', () => {
		const shape = createTable([
			['Name', 'Role'],
			['Ada', 'Engineer', 'Editor'],
		])
		expect(getCellGrid(shape)).toEqual([
			['Name', 'Role', ''],
			['Ada', 'Engineer', 'Editor'],
		])
		expect(editor.getShapePageBounds(shape)!.toJson()).toEqual({ x: 0, y: 0, w: 480, h: 80 })
		expect(editor.getShapeUtil(shape).getText(shape)).toBe('Name\tRole\t\nAda\tEngineer\tEditor')
	})

	it('does not store empty cells', () => {
		const shape = createTable([
			['a', ''],
			['', ''],
		])
		expect(Object.values(shape.props.cells)).toEqual([
			{ [getSortedTableColumns(shape.props)[0].id]: { text: 'a' } },
		])
	})

	it('creates a 3 by 3 table by default', () => {
		editor.createShape({ id, type: 'table' })
		const shape = editor.getShape<TLTableShape>(id)!
		expect(getCellGrid(shape)).toEqual([
			['', '', ''],
			['', '', ''],
			['', '', ''],
		])
	})

	it('scales columns and rows when resized', () => {
		createTable([['a', 'b']])
		editor.select(id)
		editor.resizeSelection({ scaleX: 2, scaleY: 1.5 }, 'bottom_right')
		const shape = editor.getShape<TLTableShape>(id)!
		expect(getSortedTableColumns(shape.props).map((c) => c.width)).toEqual([320, 320])
		expect(getSortedTableRows(shape.props).map((r) => r.height)).toEqual([60])
	})

	it('keeps cell content when duplicated', () => {
		createTable([['a', 'b']])
		editor.select(id)
		editor.duplicateShapes([id])
		const duplicate = editor.getOnlySelectedShape() as TLTableShape
		expect(duplicate.id).not.toBe(id)
		expect(getCellGrid(duplicate)).toEqual([['a', 'b']])
	})

	it('exports cell text to SVG', async () => {
		vi.useRealTimers()
		createTable([['Hello', 'World']])
		const svg = await editor.getSvgString([id])
		expect(svg!.svg).toContain('Hello')
		expect(svg!.svg).toContain('World')
	})
})

describe('table helpers', () => {
	it('sets and clears cell text', () => {
		const shape = createTable([['', '']])
		const [row] = getSortedTableRows(shape.props)
		const [column] = getSortedTableColumns(shape.props)

		const withText = { ...shape.props, ...setTableCellText(shape.props, row.id, column.id, 'x') }
		expect(withText.cells).toEqual({ [row.id]: { [column.id]: { text: 'x' } } })

		const cleared = setTableCellText(withText, row.id, column.id, '')
		expect(cleared.cells).toEqual({})
	})

	it('appends rows and columns after the last ones', () => {
		const shape = createTable([['a', 'b']])
		editor.updateShape<TLTableShape>({
			id,
			type: 'table',
			props: { ...appendTableRow(shape.props), ...appendTableColumn(shape.props) },
		})
		expect(getCellGrid(editor.getShape<TLTableShape>(id)!)).toEqual([
			['a', 'b', ''],
			['', '', ''],
		])
	})

	it('inserts rows and columns on either side of another one', () => {
		const shape = createTable([
			['a', 'b'],
			['c', 'd'],
		])
		const [rowA, rowC] = getSortedTableRows(shape.props)
		const [, columnB] = getSortedTableColumns(shape.props)
		editor.updateShape<TLTableShape>({
			id,
			type: 'table',
			props: {
				...insertTableRow(shape.props, rowC.id, 'before'),
				...insertTableColumn(shape.props, columnB.id, 'after'),
			},
		})
		const afterInsert = editor.getShape<TLTableShape>(id)!
		expect(getCellGrid(afterInsert)).toEqual([
			['a', 'b', ''],
			['', '', ''],
			['c', 'd', ''],
		])
		editor.updateShape<TLTableShape>({
			id,
			type: 'table',
			props: insertTableRow(afterInsert.props, rowA.id, 'before'),
		})
		expect(getCellGrid(editor.getShape<TLTableShape>(id)!)[0]).toEqual(['', '', ''])
	})

	it('removes a row or column together with its cells', () => {
		const shape = createTable([
			['a', 'b'],
			['c', 'd'],
		])
		const [rowA] = getSortedTableRows(shape.props)
		const [, columnB] = getSortedTableColumns(shape.props)
		editor.updateShape<TLTableShape>({
			id,
			type: 'table',
			props: removeTableRow(shape.props, rowA.id),
		})
		const afterRow = editor.getShape<TLTableShape>(id)!
		expect(getCellGrid(afterRow)).toEqual([['c', 'd']])
		expect(afterRow.props.cells[rowA.id]).toBeUndefined()

		editor.updateShape<TLTableShape>({
			id,
			type: 'table',
			props: removeTableColumn(afterRow.props, columnB.id),
		})
		const afterColumn = editor.getShape<TLTableShape>(id)!
		expect(getCellGrid(afterColumn)).toEqual([['c']])
		expect(Object.values(afterColumn.props.cells).flatMap(Object.keys)).not.toContain(columnB.id)
	})

	it('does not remove the last row or column', () => {
		const shape = createTable([['a']])
		const [row] = getSortedTableRows(shape.props)
		const [column] = getSortedTableColumns(shape.props)
		expect(removeTableRow(shape.props, row.id)).toBeUndefined()
		expect(removeTableColumn(shape.props, column.id)).toBeUndefined()
	})
})
