// This file is auto-generated. Do not edit it directly.
// Instead, edit the fetchEverythingSql.test.ts file and run yarn test -u

export const fetchEverythingSql = `
WITH "user_file_states" AS (SELECT * FROM public."file_state" WHERE "userId" = $1)
SELECT 'user' as "table", "id"::text as "0", "name"::text as "1", "email"::text as "2", "avatar"::text as "3", "color"::text as "4", "exportFormat"::text as "5", "exportTheme"::text as "6", "flags"::text as "7", "locale"::text as "8", "colorScheme"::text as "9", "exportBackground"::boolean as "10", "exportPadding"::boolean as "11", "isSnapMode"::boolean as "12", "isWrapMode"::boolean as "13", "isDynamicSizeMode"::boolean as "14", "isPasteAtCursorMode"::boolean as "15", "allowAnalyticsCookie"::boolean as "16", "createdAt"::bigint as "17", "updatedAt"::bigint as "18", "animationSpeed"::bigint as "19", "edgeScrollSpeed"::bigint as "20"FROM public."user" WHERE "id" = $1
UNION
SELECT 'file_state' as "table", "userId"::text as "0", "fileId"::text as "1", "lastSessionState"::text as "2", null::text as "3", null::text as "4", null::text as "5", null::text as "6", null::text as "7", null::text as "8", null::text as "9", "isFileOwner"::boolean as "10", "isPinned"::boolean as "11", null::boolean as "12", null::boolean as "13", null::boolean as "14", null::boolean as "15", null::boolean as "16", "firstVisitAt"::bigint as "17", "lastEditAt"::bigint as "18", "lastVisitAt"::bigint as "19", null::bigint as "20"FROM user_file_states
UNION
SELECT 'file' as "table", "id"::text as "0", "name"::text as "1", "ownerId"::text as "2", "ownerName"::text as "3", "ownerAvatar"::text as "4", "thumbnail"::text as "5", "sharedLinkType"::text as "6", "publishedSlug"::text as "7", "createSource"::text as "8", null::text as "9", "shared"::boolean as "10", "published"::boolean as "11", "isEmpty"::boolean as "12", "isDeleted"::boolean as "13", null::boolean as "14", null::boolean as "15", null::boolean as "16", "lastPublished"::bigint as "17", "createdAt"::bigint as "18", "updatedAt"::bigint as "19", null::bigint as "20"FROM public."file" WHERE "ownerId" = $1 OR "shared" = true AND EXISTS(SELECT 1 FROM user_file_states WHERE "fileId" = file.id)
UNION
SELECT 'user_mutation_number' as "table", null::text as "0", null::text as "1", null::text as "2", null::text as "3", null::text as "4", null::text as "5", null::text as "6", null::text as "7", null::text as "8", null::text as "9", null::boolean as "10", null::boolean as "11", null::boolean as "12", null::boolean as "13", null::boolean as "14", null::boolean as "15", null::boolean as "16", "mutationNumber"::bigint as "17", null::bigint as "18", null::bigint as "19", null::bigint as "20"FROM public."user_mutation_number" WHERE "userId" = $1
UNION
SELECT 'lsn' as "table", pg_current_wal_lsn()::text as "0", null::text as "1", null::text as "2", null::text as "3", null::text as "4", null::text as "5", null::text as "6", null::text as "7", null::text as "8", null::text as "9", null::boolean as "10", null::boolean as "11", null::boolean as "12", null::boolean as "13", null::boolean as "14", null::boolean as "15", null::boolean as "16", null::bigint as "17", null::bigint as "18", null::bigint as "19", null::bigint as "20"
`

export const columnNamesByAlias = {
	user: {
		'0': 'id',
		'1': 'name',
		'2': 'email',
		'3': 'avatar',
		'4': 'color',
		'5': 'exportFormat',
		'6': 'exportTheme',
		'7': 'flags',
		'8': 'locale',
		'9': 'colorScheme',
		'10': 'exportBackground',
		'11': 'exportPadding',
		'12': 'isSnapMode',
		'13': 'isWrapMode',
		'14': 'isDynamicSizeMode',
		'15': 'isPasteAtCursorMode',
		'16': 'allowAnalyticsCookie',
		'17': 'createdAt',
		'18': 'updatedAt',
		'19': 'animationSpeed',
		'20': 'edgeScrollSpeed',
	},
	file_state: {
		'0': 'userId',
		'1': 'fileId',
		'2': 'lastSessionState',
		'10': 'isFileOwner',
		'11': 'isPinned',
		'17': 'firstVisitAt',
		'18': 'lastEditAt',
		'19': 'lastVisitAt',
	},
	file: {
		'0': 'id',
		'1': 'name',
		'2': 'ownerId',
		'3': 'ownerName',
		'4': 'ownerAvatar',
		'5': 'thumbnail',
		'6': 'sharedLinkType',
		'7': 'publishedSlug',
		'8': 'createSource',
		'10': 'shared',
		'11': 'published',
		'12': 'isEmpty',
		'13': 'isDeleted',
		'17': 'lastPublished',
		'18': 'createdAt',
		'19': 'updatedAt',
	},
	user_mutation_number: {
		'17': 'mutationNumber',
	},
	lsn: {
		'0': 'lsn',
	},
}

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
