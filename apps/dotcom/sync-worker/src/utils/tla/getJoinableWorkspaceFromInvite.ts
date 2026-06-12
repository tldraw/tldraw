import { DB } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'

/**
 * Resolve the workspace an invite token points to, or null if the token can't
 * be used to join: it's unknown/expired, the workspace is deleted, or it's a
 * home workspace (workspace id === its owner's user id), which is private.
 * Callers treat null as an invalid token.
 */
export async function getJoinableWorkspaceFromInvite(
	db: Kysely<DB>,
	token: string
): Promise<{ id: string; name: string } | null> {
	const workspace = await db
		.selectFrom('workspace')
		.select(['id', 'name', 'isDeleted'])
		.where('inviteSecret', '=', token)
		.executeTakeFirst()
	if (!workspace || workspace.isDeleted) return null

	// A home workspace has the same id as its owning user.
	const homeOwner = await db
		.selectFrom('user')
		.select('id')
		.where('id', '=', workspace.id)
		.executeTakeFirst()
	if (homeOwner) return null

	return { id: workspace.id, name: workspace.name }
}
