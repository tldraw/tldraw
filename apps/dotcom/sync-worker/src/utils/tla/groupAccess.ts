import { Capability, DB, can } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'

/**
 * Whether a user has a capability in a group, resolved from the database. This
 * is the sync-worker's server-side counterpart to `can`: it looks up the user's
 * role in the group, then defers to the shared capability table. Use it instead
 * of checking group membership existence directly, so worker authorization stays
 * in sync with the role definitions in `@tldraw/dotcom-shared`.
 */
export async function userCanInGroup(
	db: Kysely<DB>,
	userId: string | null | undefined,
	groupId: string | null | undefined,
	capability: Capability
): Promise<boolean> {
	if (!userId || !groupId) return false
	const member = await db
		.selectFrom('group_user')
		.select('role')
		.where('groupId', '=', groupId)
		.where('userId', '=', userId)
		.executeTakeFirst()
	return can(member?.role, capability)
}
