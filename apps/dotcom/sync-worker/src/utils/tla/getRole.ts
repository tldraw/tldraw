import { DB, Role } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'

/**
 * Resolve a user's role in a workspace from the database, or null if they
 * aren't a member. The sync-worker's counterpart to the mutators' getRole;
 * compose it with `can`, e.g. `can(await getRole(db, userId, workspaceId), 'accessFiles')`.
 */
export async function getRole(
	db: Kysely<DB>,
	userId: string | null | undefined,
	workspaceId: string | null | undefined
): Promise<Role | null> {
	if (!userId || !workspaceId) return null
	const member = await db
		.selectFrom('workspace_user')
		.select('role')
		.where('workspaceId', '=', workspaceId)
		.where('userId', '=', userId)
		.executeTakeFirst()
	return member?.role ?? null
}
