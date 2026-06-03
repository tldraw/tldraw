export {
	buildGrid,
	diffTableStructure,
	getCellAtPoint,
	getCellKey,
	getTableLayout,
	resolveCellStyle,
	TABLE_CONSTANTS,
	type TableStructureChange,
	withColumnInserted,
	withColumnRemoved,
	withColumnWidth,
	withRowHeight,
	withRowInserted,
	withRowRemoved,
	type ResolvedCellStyle,
	type TableColLayout,
	type TableLayout,
	type TableRowLayout,
} from './core'
export { type TLTableCellKind, type TLTableCellKindProps, textCellKind } from './cellKinds'
export { reflowRowHeights } from './reflow'
export { TableCellShapeUtil, type TableCellShapeOptions } from './TableCellShapeUtil'
export { TableShapeTool } from './TableShapeTool'
export { TableShapeUtil } from './TableShapeUtil'
export {
	deleteColumn,
	deleteRow,
	drillSelectCell,
	findOrCreateCell,
	getCellText,
	getTableCells,
	getTableData,
	insertColumn,
	insertRow,
	isCellEmpty,
	navigateCell,
	reconcileTable,
	selectColumn,
	selectRow,
	setCellText,
	setColumnWidth,
	setRowHeight,
} from './tableOperations'
