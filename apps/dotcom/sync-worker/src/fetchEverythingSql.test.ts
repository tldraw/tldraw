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

interface WithClause {
	alias: string
	expression: string
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

const withs = [
	{
		alias: 'my_owned_files',
		expression: 'SELECT * FROM public."file" WHERE "ownerId" = $1 AND "isDeleted" = false',
	},
	{
		alias: 'my_file_states',
		expression: 'SELECT * FROM public."file_state" WHERE "userId" = $1',
	},
	{
		alias: 'files_shared_with_me',
		expression:
			'SELECT f.* FROM my_file_states ufs JOIN public."file" f ON f.id = ufs."fileId" WHERE ufs."isFileOwner" = false AND f.shared = true',
	},
	{
		alias: 'my_group_ids',
		expression: 'SELECT "groupId" FROM public."group_user" WHERE "userId" = $1',
	},
	{
		alias: 'my_groups',
		expression:
			'SELECT g.* FROM my_group_ids mg JOIN public."group" g ON g.id = mg."groupId" WHERE g."isDeleted" = false',
	},
	{
		alias: 'all_group_users',
		expression:
			'SELECT ug.* FROM my_groups mg JOIN public."group_user" ug ON ug."groupId" = mg."id"',
	},
	{
		alias: 'group_file_ownership',
		expression:
			'SELECT fg.* FROM my_groups mg JOIN public."group_file" fg ON fg."groupId" = mg."id"',
	},
	{
		alias: 'group_files',
		expression:
			'SELECT f.* FROM group_file_ownership gfo JOIN public."file" f ON f.id = gfo."fileId"',
	},
	{
		alias: 'all_files',
		expression:
			'SELECT * from my_owned_files UNION SELECT * from files_shared_with_me UNION SELECT * from group_files',
	},
	{
		alias: 'all_presences',
		expression:
			'SELECT p.* FROM all_files af JOIN public."user_presence" p ON p."fileId" = af."id"',
	},
] as const satisfies WithClause[]

type WithTable = (typeof withs)[number]['alias']

interface SelectClause {
	from?: WithTable | `public."${keyof typeof schema.tables}"` | 'public."user_mutation_number"'
	outputTableName: string
	columns: Array<ColumnStuff>
	where?: string
}

const selects: SelectClause[] = [
	{
		from: 'public."user"',
		outputTableName: 'user',
		columns: makeColumnStuff(schema.tables.user),
		where: '"id" = $1',
	},
	{
		from: 'my_file_states',
		outputTableName: 'file_state',
		columns: makeColumnStuff(schema.tables.file_state),
	},
	{
		from: 'all_files',
		outputTableName: 'file',
		columns: makeColumnStuff(schema.tables.file),
	},
	{
		from: 'group_file_ownership',
		outputTableName: 'group_file',
		columns: makeColumnStuff(schema.tables.group_file),
	},
	{
		from: 'my_groups',
		outputTableName: 'group',
		columns: makeColumnStuff(schema.tables.group),
	},
	{
		from: 'all_group_users',
		outputTableName: 'group_user',
		columns: makeColumnStuff(schema.tables.group_user),
	},
	{
		from: 'all_presences',
		outputTableName: 'user_presence',
		columns: makeColumnStuff(schema.tables.user_presence),
	},
	{
		from: 'public."user_mutation_number"',
		outputTableName: 'user_mutation_number',
		columns: [{ expression: '"mutationNumber"', type: 'bigint', name: 'mutationNumber' }],
		where: '"userId" = $1',
	},
	{
		outputTableName: 'lsn',
		columns: [{ expression: 'pg_current_wal_lsn()', type: 'text', name: 'lsn' }],
	},
]

const withClause = withs.length
	? `WITH\n  ${withs.map((w) => `${w.alias} AS (${w.expression})`).join(',\n  ')}`
	: ''

const maxColumnsForType: Record<string, number> = {}
for (const { columns } of selects) {
	const groupedColumns = groupBy(columns, (c) => c.type)
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

const mainSelects: string[] = []

for (const select of selects) {
	const columnConfig = structuredClone(columnConfigTemplate)
	const nameByAlias: Record<string, string> = {}
	for (const column of select.columns) {
		const nextSlot = columnConfig.find((c) => c.type === column.type && c.expression === null)
		assert(nextSlot, 'no more slots for type ' + column.type)
		nextSlot.expression = column.expression
		nameByAlias[nextSlot.alias] = column.name
	}
	columnNamesByAlias[select.outputTableName] = nameByAlias
	const columnSelectString = columnConfig
		.map((c) => `${c.expression ?? 'null'}::${c.type} as "${c.alias}"`)
		.join(',\n  ')
	let selectString = `SELECT\n  '${select.outputTableName}' as "table",\n  ${columnSelectString}`
	if (select.from) {
		selectString += `\nFROM ${select.from}`
	}
	if (select.where) {
		selectString += `\nWHERE ${select.where}`
	}
	mainSelects.push(selectString)
}

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
		writeFileSync('./src/fetchEverythingSql.snap.ts', formattedCode, 'utf-8')
		return
	}

	const fileContents = readFileSync('./src/fetchEverythingSql.snap.ts', 'utf-8').toString()
	expect(formattedCode).toEqual(fileContents)
})
