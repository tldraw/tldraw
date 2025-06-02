import { columnNamesByAlias } from './fetchEverythingSql.snap'

export function parseResultRow(row: any): { table: keyof typeof columnNamesByAlias; row: any } {
	const result = {} as any
	const columnNameByAlias = columnNamesByAlias[row.table as keyof typeof columnNamesByAlias]
	for (const [alias, columnName] of Object.entries(columnNameByAlias)) {
		result[columnName] = row[alias]
	}
	return {
		table: row.table,
		row: result,
	}
}
