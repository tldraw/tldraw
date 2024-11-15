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
function makeColumnStuff(
	table: string,
	column: string,
	details: Omit<ZColumn, 'canUpdate'>
): ColumnStuff {
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
const nulls = (ns: ColumnStuff[]) =>
	ns.map((n) => `null::${ourTypeToPostgresType[n.type]} as "${n.alias}"`)
const userNulls = nulls(userKeys)
const fileNulls = nulls(fileKeys)
const fileStateNulls = nulls(fileStateKeys)
const userColumns = userKeys.map((c) => `${c.reference} as "${c.alias}"`)
const fileColumns = fileKeys.map((c) => `${c.reference} as "${c.alias}"`)
const fileStateColumns = fileStateKeys.map((c) => `${c.reference} as "${c.alias}"`)

export function getFetchUserDataSql(userId: string, bootId: string) {
	return `
INSERT INTO public.user_boot_id ("userId", "bootId") VALUES ('${userId}', '${bootId}') ON CONFLICT ("userId") DO UPDATE SET "bootId" = '${bootId}';
SELECT 'user' AS "table", ${userColumns.concat(fileNulls).concat(fileStateNulls)} FROM public.user WHERE "id" = '${userId}'
UNION
SELECT 'file' AS "table", ${userNulls.concat(fileColumns).concat(fileStateNulls)} FROM public.file WHERE "ownerId" = '${userId}' OR EXISTS(SELECT 1 FROM public.file_state WHERE "userId" = '${userId}' AND public.file_state."fileId" = public.file.id) 
UNION
SELECT 'file_state' AS "table", ${userNulls.concat(fileNulls).concat(fileStateColumns)} FROM public.file_state WHERE "userId" = '${userId}';
`
}

export function parseResultRow(keys: ColumnStuff[], row: any) {
	const obj = {} as any
	keys.forEach(({ alias, name }) => {
		obj[name] = row[alias]
	})
	return obj
}
