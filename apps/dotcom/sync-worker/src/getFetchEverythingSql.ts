import {
	ZColumn,
	file,
	file_state,
	group,
	user,
	user_group,
	user_presence,
} from '@tldraw/dotcom-shared'
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
export const userKeys = Object.entries(user.schema.columns).map(
	([name, { type }]): ColumnStuff => makeColumnStuff('user', name, { type })
)
export const fileKeys = Object.entries(file.schema.columns).map(
	([name, { type }]): ColumnStuff => makeColumnStuff('file', name, { type })
)
export const fileStateKeys = Object.entries(file_state.schema.columns).map(
	([name, { type }]): ColumnStuff => makeColumnStuff('file_state', name, { type })
)
export const groupKeys = Object.entries(group.schema.columns).map(
	([name, { type }]): ColumnStuff => makeColumnStuff('group', name, { type })
)
export const userGroupKeys = Object.entries(user_group.schema.columns).map(
	([name, { type }]): ColumnStuff => makeColumnStuff('user_group', name, { type })
)
export const userPresenceKeys = Object.entries(user_presence.schema.columns).map(
	([name, { type }]): ColumnStuff => makeColumnStuff('user_presence', name, { type })
)

const nulls = (ns: ColumnStuff[]) =>
	ns.map((n) => `null::${ourTypeToPostgresType[n.type]} as "${n.alias}"`)
const userNulls = nulls(userKeys)
const fileNulls = nulls(fileKeys)
const fileStateNulls = nulls(fileStateKeys)
const groupNulls = nulls(groupKeys)
const userGroupNulls = nulls(userGroupKeys)
const userPresenceNulls = nulls(userPresenceKeys)


const userColumns = userKeys.map((c) => `${c.reference} as "${c.alias}"`)
const fileColumns = fileKeys.map((c) => `${c.reference} as "${c.alias}"`)
const fileStateColumns = fileStateKeys.map((c) => `${c.reference} as "${c.alias}"`)
const groupColumns = groupKeys.map((c) => `${c.reference} as "${c.alias}"`)
const userGroupColumns = userGroupKeys.map((c) => `${c.reference} as "${c.alias}"`)
const userPresenceColumns = userPresenceKeys.map((c) => `${c.reference} as "${c.alias}"`)

export function getFetchUserDataSql(userId: string) {
	return sql`
SELECT 'user' AS "table", null::bigint as "mutationNumber", null::text as "lsn", ${sql.raw(userColumns + ',' + fileNulls + ',' + fileStateNulls + ',' + groupNulls + ',' + userGroupNulls + ',' + userPresenceNulls)} FROM public.user WHERE "id" = '${sql.raw(userId)}'
UNION
SELECT 'file' AS "table", null::bigint as "mutationNumber", null::text as "lsn", ${sql.raw(userNulls + ',' + fileColumns + ',' + fileStateNulls + ',' + groupNulls + ',' + userGroupNulls + ',' + userPresenceNulls)} FROM public.file WHERE ("ownerId" = '${sql.raw(userId)}' OR "shared" = true AND EXISTS(SELECT 1 FROM public.file_state WHERE "userId" = '${sql.raw(userId)}' AND public.file_state."fileId" = public.file.id))
UNION
SELECT 'file_state' AS "table", null::bigint as "mutationNumber", null::text as "lsn", ${sql.raw(userNulls + ',' + fileNulls + ',' + fileStateColumns + ',' + groupNulls + ',' + userGroupNulls + ',' + userPresenceNulls)} FROM public.file_state WHERE "userId" = '${sql.raw(userId)}'
UNION
SELECT 'group' AS "table", null::bigint as "mutationNumber", null::text as "lsn", ${sql.raw(userNulls + ',' + fileNulls + ',' + fileStateNulls+ ',' + groupColumns +  ',' + userGroupNulls + ',' + userPresenceNulls)} FROM public.group WHERE EXISTS(SELECT 1 FROM public.user_group WHERE "userId" = '${sql.raw(userId)}' AND public.user_group."groupId" = public.group.id)
UNION
SELECT 'user_group' AS "table", null::bigint as "mutationNumber", null::text as "lsn", ${sql.raw(userNulls + ',' + fileNulls + ',' + fileStateNulls + ',' + groupNulls + ',' + userGroupColumns + ',' + userPresenceNulls)} FROM public.user_group WHERE "userId" = '${sql.raw(userId)}'
UNION
SELECT 'user_presence' AS "table", null::bigint as "mutationNumber", null::text as "lsn", ${sql.raw(userNulls + ',' + fileNulls + ',' + fileStateNulls + ',' + groupNulls + ',' + userGroupNulls + ',' + userPresenceColumns)} FROM public.user_presence WHERE "userId" = '${sql.raw(userId)}'
UNION
SELECT 'lsn' as "table", null::bigint as "mutationNumber", pg_current_wal_lsn()::text as "lsn", ${sql.raw(userNulls + ',' + fileNulls + ',' + fileStateNulls)}
UNION
SELECT 'user_mutation_number' as "table", "mutationNumber"::bigint as "mutationNumber", null::text as "lsn", ${sql.raw(userNulls + ',' + fileNulls + ',' + fileStateNulls)} FROM public.user_mutation_number;
`
}

export function parseResultRow(keys: ColumnStuff[], row: any) {
	const obj = {} as any
	keys.forEach(({ alias, name }) => {
		obj[name] = row[alias]
	})
	return obj
}
