import { ZColumn, tlaFileSchema, tlaFileStateSchema, tlaUserSchema } from '@tldraw/dotcom-shared'
import { sql } from 'kysely'
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
	return sql`
WITH upsert AS (
  INSERT INTO public.user_boot_id ("userId", "bootId")
  VALUES (${userId}, ${bootId})
  ON CONFLICT ("userId") DO UPDATE SET "bootId" = ${bootId}
)
SELECT 'user' AS "table", null::bigint as "mutationNumber", ${sql.raw(userColumns + ',' + fileNulls + ',' + fileStateNulls)} FROM public.user WHERE "id" = '${sql.raw(userId)}'
UNION
SELECT 'file' AS "table", null::bigint as "mutationNumber", ${sql.raw(userNulls + ',' + fileColumns + ',' + fileStateNulls)} FROM public.file WHERE "isDeleted" = false AND "ownerId" = '${sql.raw(userId)}' OR "shared" = true AND EXISTS(SELECT 1 FROM public.file_state WHERE "userId" = '${sql.raw(userId)}' AND public.file_state."fileId" = public.file.id)
UNION
SELECT 'file_state' AS "table", null::bigint as "mutationNumber", ${sql.raw(userNulls + ',' + fileNulls + ',' + fileStateColumns)} FROM public.file_state WHERE "userId" = '${sql.raw(userId)}'
UNION
SELECT 'user_mutation_number' as "table", "mutationNumber"::bigint, ${sql.raw(userNulls + ',' + fileNulls + ',' + fileStateNulls)} FROM public.user_mutation_number WHERE "userId" = '${sql.raw(userId)}';
`
}

export function parseResultRow(keys: ColumnStuff[], row: any) {
	const obj = {} as any
	keys.forEach(({ alias, name }) => {
		obj[name] = row[alias]
	})
	return obj
}
