import { DB, Role } from '@tldraw/dotcom-shared'
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
