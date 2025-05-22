import { ZColumn, schema } from '@tldraw/dotcom-shared'
import { assert, assertExists, groupBy, structuredClone } from '@tldraw/utils'
import { execSync } from 'child_process'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'

const ourTypeToPostgresType: Record<ZColumn['type'], string> = {
	string: 'text',
	number: 'bigint',
	boolean: 'boolean',
}

interface ColumnStuff {
	type: string
	expression: string
	name: string
}

interface TableStuff {
	alias: string
	columns: Array<ColumnStuff>
	tableName?: string
	where?: string
	withAlias?: string
}
function makeColumnStuff(table: (typeof schema.tables)[keyof typeof schema.tables]) {
	return Object.entries(table.columns)
		.map(([name, { type }]) => ({
			name,
			type: assertExists(ourTypeToPostgresType[type], `unknown type ${type}`),
			expression: `"${name}"`,
		}))
		.sort((a, b) => a.name.localeCompare(b.name))
}

const tables: TableStuff[] = [
	{
		tableName: 'user',
		alias: 'user',
		columns: makeColumnStuff(schema.tables.user),
		where: '"id" = $1',
	},
	{
		tableName: 'file_state',
		alias: 'file_state',
		columns: makeColumnStuff(schema.tables.file_state),
		withAlias: 'user_file_states',
		where: '"userId" = $1',
	},
	{
		tableName: 'file',
		alias: 'file',
		columns: makeColumnStuff(schema.tables.file),
		where: `"ownerId" = $1 OR "shared" = true AND EXISTS(SELECT 1 FROM user_file_states WHERE "fileId" = file.id)`,
	},
	{
		tableName: 'user_mutation_number',
		alias: 'user_mutation_number',
		columns: [{ expression: '"mutationNumber"', type: 'bigint', name: 'mutationNumber' }],
		where: '"userId" = $1',
	},
	{
		alias: 'lsn',
		columns: [{ expression: 'pg_current_wal_lsn()', type: 'text', name: 'lsn' }],
	},
]

const maxColumnsForType: Record<string, number> = {}
for (const table of tables) {
	const groupedColumns = groupBy(table.columns, (c) => c.type)
	for (const type in groupedColumns) {
		maxColumnsForType[type] = Math.max(maxColumnsForType[type] ?? 0, groupedColumns[type].length)
	}
}
const columnConfigTemplate = Object.freeze(
	Object.entries(maxColumnsForType)
		.flatMap(([type, count]) =>
			new Array(count).fill(0).map(() => ({ type, expression: null as null | string }))
		)
		.map((col, i) => ({ ...col, alias: `${i}` }))
)
const columnNamesByAlias: Record<string, Record<string, string>> = {}

const withSelects: string[] = []
const mainSelects: string[] = []

for (const table of tables) {
	const columnConfig = structuredClone(columnConfigTemplate)
	const nameByAlias: Record<string, string> = {}
	for (const column of table.columns) {
		const nextSlot = columnConfig.find((c) => c.type === column.type && c.expression === null)
		assert(nextSlot, 'no more slots for type ' + column.type)
		nextSlot.expression = column.expression
		nameByAlias[nextSlot.alias] = column.name
	}
	columnNamesByAlias[table.alias] = nameByAlias
	const columnSelectString = columnConfig
		.map((c) => `${c.expression ?? 'null'}::${c.type} as "${c.alias}"`)
		.join(', ')
	let selectString = `SELECT '${table.alias}' as "table", ${columnSelectString}`
	if (table.withAlias ?? table.tableName) {
		selectString += `FROM ${table.withAlias ?? `public."${table.tableName}"`}`
	}
	if (table.where && !table.withAlias) {
		selectString += ` WHERE ${table.where}`
	}
	mainSelects.push(selectString)
	if (!table.withAlias) continue
	let withSelect = `SELECT * FROM public."${table.tableName}"`
	if (table.where) {
		withSelect += ` WHERE ${table.where}`
	}
	withSelects.push(`"${table.withAlias}" AS (${withSelect})`)
}

const withClause = withSelects.length ? `WITH ${withSelects.join(', ')}` : ''
const mainSelect = `${mainSelects.join('\nUNION\n')}`
const fetchEverythingSql = `${withClause}\n${mainSelect}`.trim()

function escapeForTemplateLiteral(str: string) {
	return str
		.replace(/\\/g, '\\\\') // escape backslashes
		.replace(/`/g, '\\`') // escape backticks
		.replace(/\$\{/g, '\\${') // escape ${ to avoid interpolation
}

const tsFile = `// This file is auto-generated. Do not edit it directly.
// Instead, edit the fetchEverythingSql.test.ts file and run yarn test -u

export const fetchEverythingSql = \`
${escapeForTemplateLiteral(fetchEverythingSql)}
\`

export const columnNamesByAlias = ${JSON.stringify(columnNamesByAlias, null, 2)}

export function parseResultRow(row: any): { table: keyof typeof columnNamesByAlias; row: any } {
	const result = {} as any
	const columnNameByAlias = columnNamesByAlias[row.table  as keyof typeof columnNamesByAlias]
	for (const [alias, columnName] of Object.entries(columnNameByAlias)) {
		result[columnName] = row[alias]
	}
	return {
		table: row.table,
		row: result,
	}
}
`
test('fetchEverythingSql snapshot (RUN `yarn test -u` IF THIS FAILS)', async () => {
	const tmpFile = './src/.fetchEverythingSql.tmp.ts'
	writeFileSync(tmpFile, tsFile, 'utf-8')
	execSync('yarn run -T prettier --write ' + tmpFile, {
		stdio: 'inherit',
		env: {
			...process.env,
		},
	})
	const formattedCode = readFileSync(tmpFile, 'utf-8').toString()
	unlinkSync(tmpFile)

	const isUpdating = expect.getState().snapshotState._updateSnapshot === 'all'
	if (isUpdating) {
		writeFileSync('./src/fetchEverythingSql.ts', formattedCode, 'utf-8')
		return
	}

	const fileContents = readFileSync('./src/fetchEverythingSql.ts', 'utf-8').toString()
	expect(formattedCode).toEqual(fileContents)
})
