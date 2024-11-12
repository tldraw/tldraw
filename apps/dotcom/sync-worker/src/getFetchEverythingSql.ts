import { ZColumn, tlaFileSchema, tlaFileStateSchema, tlaUserSchema } from '@tldraw/dotcom-shared'
interface ColumnStuff {
	name: string
	type: 'string' | 'number' | 'boolean'
	alias: string
	reference: string
}
const ourTypeToPostgresType: Record<ZColumn['type'], string> = {
	string: 'text',
	number: 'bigint',
	boolean: 'boolean',
}
function makeColumnStuff(table: string, column: string, details: ZColumn): ColumnStuff {
	return {
		name: column,
		type: details.type,
		alias: `${table}.${column}`,
		reference: `public.${table}."${column}"::${ourTypeToPostgresType[details.type]}`,
	}
}
export const userKeys = Object.entries(tlaUserSchema.columns).map(
	([name, { type }]): ColumnStuff => makeColumnStuff('user', name, { type })
)
export const fileKeys = Object.entries(tlaFileSchema.columns).map(
	([name, { type }]): ColumnStuff => makeColumnStuff('file', name, { type })
)
export const fileStateKeys = Object.entries(tlaFileStateSchema.columns).map(
	([name, { type }]): ColumnStuff => makeColumnStuff('file_state', name, { type })
)
const nulls = (table: string, ns: ColumnStuff[]) =>
	ns.map((n) => `null::${ourTypeToPostgresType[n.type]} as "${n.alias}"`)
const userNulls = nulls('user', userKeys)
const fileNulls = nulls('file', fileKeys)
const fileStateNulls = nulls('file_state', fileStateKeys)
const userColumns = userKeys.map((c) => `${c.reference} as "${c.alias}"`)
const fileColumns = fileKeys.map((c) => `${c.reference} as "${c.alias}"`)
const fileStateColumns = fileStateKeys.map((c) => `${c.reference} as "${c.alias}"`)

export function getFetchEverythingSql(replicatorId: string, bootId: string) {
	return `
insert into public.replicator_boot_id ("replicatorId", "bootId") values ('${replicatorId}', '${bootId}') ON CONFLICT ("replicatorId") DO UPDATE SET "bootId" = '${bootId}';
select 'user' as "table", ${userColumns.concat(fileNulls).concat(fileStateNulls)} from public.user
union
select 'file' as "table", ${userNulls.concat(fileColumns).concat(fileStateNulls)} from public.file
union
select 'file_state' as "table", ${userNulls.concat(fileNulls).concat(fileStateColumns)} from public.file_state;
`
}

export function parseResultRow(keys: ColumnStuff[], row: any) {
	const obj = {} as any
	keys.forEach(({ alias, name }) => {
		obj[name] = row[alias]
	})
	return obj
}
