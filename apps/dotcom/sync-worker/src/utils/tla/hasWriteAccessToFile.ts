import { DB, can } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'
import { getRole } from './getRole'

/**
 * The write gate shared by both asset upload paths. Existence alone is not
 * enough: it would let anyone associate an object with someone else's file.
 * Deleted files are refused too, and a missing file is indistinguishable from
 * a forbidden one so callers cannot probe for ids.
 */
export async function hasWriteAccessToFile(
	db: Kysely<DB>,
	fileId: string,
	userId: string | null
): Promise<boolean> {
	const file = await db
		.selectFrom('file')
		.where('id', '=', fileId)
		.select(['owningGroupId', 'shared', 'sharedLinkType', 'isDeleted'])
		.executeTakeFirst()
	if (!file || file.isDeleted) return false
	if (file.shared && file.sharedLinkType === 'edit') return true
	if (userId && file.owningGroupId) {
		return can(await getRole(db, userId, file.owningGroupId), 'accessFiles')
	}
	return false
}
