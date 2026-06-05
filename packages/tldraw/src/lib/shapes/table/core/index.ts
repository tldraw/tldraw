// Pure table logic — no editor or rendering imports. Safe to unit-test in isolation
// and (in principle) extract. The editor-coupled wrappers live one level up.
export {
	TABLE_CONSTANTS,
	type TableColLayout,
	type TableLayout,
	type TableRowLayout,
} from './constants'
export { getCellAtPoint, getCellKey, getCellsInRange, getTableLayout } from './layout'
export { getMergeMap, type MergedCellInfo, type TableMergeMap } from './merge'
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
export { isCellStyleDefault, resolveCellStyle, type ResolvedCellStyle } from './style'
