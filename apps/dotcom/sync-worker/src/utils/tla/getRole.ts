import { DB, Role, TlaFile } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'

/**
 * Resolve a user's role in a group from the database, or null if they aren't a
 * member. The sync-worker's counterpart to the mutators' getRole; compose it
 * with `can`, e.g. `can(await getRole(db, userId, groupId), 'accessFiles')`.
 */
export async function getRole(
	db: Kysely<DB>,
	userId: string | null | undefined,
	groupId: string | null | undefined
): Promise<Role | null> {
	if (!userId || !groupId) return null
	const member = await db
		.selectFrom('group_user')
		.select('role')
		.where('groupId', '=', groupId)
		.where('userId', '=', userId)
		.executeTakeFirst()
	return member?.role ?? null
}

/**
 * A file row plus `getRole(userId, file.owningGroupId)` in one round trip, or null if the row
 * doesn't exist. Every query on the file DO pays its own Postgres dial, and the connect path
 * needs both.
 */
export async function getFileRecordWithRole(
	db: Kysely<DB>,
	fileId: string,
	userId: string | null | undefined
): Promise<{ file: TlaFile; role: Role | null } | null> {
	const row = await db
		.selectFrom('file')
		.selectAll('file')
		.select((eb) =>
			// group_user's primary key is (userId, groupId), so this yields at most one row.
			eb
				.selectFrom('group_user')
				.select('group_user.role')
				.whereRef('group_user.groupId', '=', 'file.owningGroupId')
				.where('group_user.userId', '=', userId ?? null)
				.as('role')
		)
		.where('file.id', '=', fileId)
		.executeTakeFirst()
	if (!row) return null
	const { role, ...file } = row
	return { file, role: role ?? null }
}
