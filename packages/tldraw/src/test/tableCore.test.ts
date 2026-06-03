import { TLTableCellShape, TLTableShape } from '@tldraw/editor'
import {
	buildGrid,
	getCellAtPoint,
	getCellKey,
	getTableLayout,
	resolveCellStyle,
	TABLE_CONSTANTS,
	withColumnInserted,
	withColumnRemoved,
	withColumnWidth,
	withRowHeight,
	withRowInserted,
	withRowRemoved,
} from '../lib/shapes/table/core'

// The core module is pure — these tests construct plain prop objects, no editor.

function makeTable(props: Partial<TLTableShape['props']> = {}): TLTableShape {
	return {
		props: {
			cols: [
				{ id: 'c0', width: 120 },
				{ id: 'c1', width: 120 },
				{ id: 'c2', width: 120 },
			],
			rows: [{ id: 'r0' }, { id: 'r1' }, { id: 'r2' }],
			color: 'black',
			fill: 'none',
			font: 'draw',
			size: 'm',
			align: 'start',
			verticalAlign: 'middle',
			headerRows: 0,
			headerCols: 0,
			borders: 'all',
			...props,
		},
	} as unknown as TLTableShape
}

function makeCell(props: Partial<TLTableCellShape['props']> = {}): TLTableCellShape {
	return {
		props: {
			rowId: 'r0',
			colId: 'c0',
			kind: 'text',
			color: 'blue',
			fill: 'solid',
			font: 'sans',
			size: 'l',
			align: 'end',
			verticalAlign: 'start',
			...props,
		},
	} as unknown as TLTableCellShape
}

describe('core/layout', () => {
	it('keys cells by (rowId, colId)', () => {
		expect(getCellKey('r1', 'c2')).toBe('r1:c2')
	})

	it('computes positions and total size from stored widths/heights', () => {
		const layout = getTableLayout(makeTable())
		expect(layout.width).toBe(360)
		expect(layout.height).toBe(96) // 3 rows * default 32
		expect(layout.cols.map((c) => c.x)).toEqual([0, 120, 240])
		expect(layout.rows.map((r) => r.y)).toEqual([0, 32, 64])
		expect(layout.cols[1]).toMatchObject({ id: 'c1', index: 1, x: 120, width: 120 })
	})

	it('reads stored row heights (authoritative, not re-measured)', () => {
		const layout = getTableLayout(makeTable({ rows: [{ id: 'r0', height: 100 }, { id: 'r1' }] }))
		expect(layout.rows[0].height).toBe(100)
		expect(layout.rows[1].y).toBe(100)
		expect(layout.height).toBe(132)
	})

	it('treats stored height below the floor as the floor', () => {
		const layout = getTableLayout(makeTable({ rows: [{ id: 'r0', height: 10 }] }))
		expect(layout.rows[0].height).toBe(TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT)
	})

	it('hit-tests a point to its cell', () => {
		const layout = getTableLayout(makeTable())
		expect(getCellAtPoint(layout, 130, 40)).toEqual({ rowId: 'r1', colId: 'c1' })
		expect(getCellAtPoint(layout, 0, 0)).toEqual({ rowId: 'r0', colId: 'c0' })
		expect(getCellAtPoint(layout, 999, 0)).toBeNull()
		expect(getCellAtPoint(layout, -1, 0)).toBeNull()
	})
})

describe('core/style', () => {
	it('a populated cell uses its own style — even an unstyled fill in a header', () => {
		const table = makeTable({ headerRows: 1 })
		const cell = makeCell({ fill: 'none' })
		// the v1 header bug: this must return the cell fill, not the header default
		expect(resolveCellStyle(table, 0, 0, cell).fill).toBe('none')
		expect(resolveCellStyle(table, 0, 0, cell)).toMatchObject({ color: 'blue', size: 'l' })
	})

	it('an empty header cell falls back to the shaded header default', () => {
		const table = makeTable({ headerRows: 1, headerCols: 1 })
		expect(resolveCellStyle(table, 0, 1).fill).toBe('semi') // header row
		expect(resolveCellStyle(table, 1, 0).fill).toBe('semi') // header col
		expect(resolveCellStyle(table, 1, 1).fill).toBe('none') // body cell → table default
	})

	it('a non-header empty cell uses the table defaults', () => {
		const style = resolveCellStyle(makeTable({ font: 'mono', size: 's' }), 1, 1)
		expect(style).toMatchObject({ color: 'black', fill: 'none', font: 'mono', size: 's' })
	})
})

describe('core/operations', () => {
	it('inserts and removes columns, keeping at least one', () => {
		const table = makeTable()
		const inserted = withColumnInserted(table.props.cols, 1)
		expect(inserted.cols).toHaveLength(4)
		expect(inserted.cols[1].id).toBe(inserted.colId)

		const removed = withColumnRemoved(table.props.cols, 0)
		expect(removed?.cols).toHaveLength(2)
		expect(removed?.colId).toBe('c0')

		expect(withColumnRemoved([{ id: 'only', width: 120 }], 0)).toBeNull()
	})

	it('inserts and removes rows, keeping at least one', () => {
		const table = makeTable()
		expect(withRowInserted(table.props.rows, 3).rows).toHaveLength(4)
		expect(withRowRemoved(table.props.rows, 2)?.rowId).toBe('r2')
		expect(withRowRemoved([{ id: 'only' }], 0)).toBeNull()
	})

	it('clamps column width to the minimum', () => {
		const cols = withColumnWidth(makeTable().props.cols, 0, 5)
		expect(cols[0].width).toBe(TABLE_CONSTANTS.MIN_COL_WIDTH)
	})

	it('clamps row height to the floor', () => {
		const rows = withRowHeight(makeTable().props.rows, 0, 5)
		expect(rows[0].height).toBe(TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT)
	})
})

describe('core/serialization', () => {
	it('builds a row-major grid from an accessor', () => {
		const table = makeTable({
			cols: [
				{ id: 'c0', width: 1 },
				{ id: 'c1', width: 1 },
			],
			rows: [{ id: 'r0' }, { id: 'r1' }],
		})
		const grid = buildGrid(table, (rowId, colId) => `${rowId}/${colId}`)
		expect(grid).toEqual([
			['r0/c0', 'r0/c1'],
			['r1/c0', 'r1/c1'],
		])
	})
})
