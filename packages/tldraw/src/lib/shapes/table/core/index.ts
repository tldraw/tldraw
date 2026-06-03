// Pure table logic — no editor or rendering imports. Safe to unit-test in isolation
// and (in principle) extract. The editor-coupled wrappers live one level up.
export {
	TABLE_CONSTANTS,
	type TableColLayout,
	type TableLayout,
	type TableRowLayout,
} from './constants'
export { getCellAtPoint, getCellKey, getTableLayout } from './layout'
export { diffTableStructure, type TableStructureChange } from './references'
export {
	withColumnInserted,
	withColumnRemoved,
	withColumnWidth,
	withRowHeight,
	withRowInserted,
	withRowRemoved,
} from './operations'
export { buildGrid } from './serialization'
export { resolveCellStyle, type ResolvedCellStyle } from './style'
