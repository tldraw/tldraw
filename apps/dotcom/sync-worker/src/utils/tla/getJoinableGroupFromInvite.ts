import { DB } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'

/**
 * Resolve the group an invite token points to, or null if the token can't be
 * used to join: it's unknown/expired, the group is deleted, or the group is a
 * home workspace (group id === its owner's user id), which is private. Callers
 * treat null as an invalid token.
 */
export async function getJoinableGroupFromInvite(
	db: Kysely<DB>,
	token: string
): Promise<{ id: string; name: string } | null> {
	const group = await db
		.selectFrom('group')
		.select(['id', 'name', 'isDeleted'])
		.where('inviteSecret', '=', token)
		.executeTakeFirst()
	if (!group || group.isDeleted) return null

	// A home workspace has the same id as its owning user.
	const homeOwner = await db
		.selectFrom('user')
		.select('id')
		.where('id', '=', group.id)
		.executeTakeFirst()
	if (homeOwner) return null

	return { id: group.id, name: group.name }
}
