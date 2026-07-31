import { DB, TlaFile } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'

export type UndeleteFileResult =
	| { result: 'not_found' }
	| { result: 'not_deleted'; file: TlaFile }
	| { result: 'restored'; file: TlaFile }

// Restores a soft-deleted file: clears isDeleted, re-creates the owner's file_state (if the
// file has an ownerId) and the owning group's group_file link (if owningGroupId). The caller
// must hard-reboot the owner's user DO afterwards so the restored rows replicate.
export async function undeleteFile(db: Kysely<DB>, fileId: string): Promise<UndeleteFileResult> {
	const file = await db.selectFrom('file').where('id', '=', fileId).selectAll().executeTakeFirst()
	if (!file) return { result: 'not_found' }
	if (!file.isDeleted) return { result: 'not_deleted', file }

	const now = Date.now()
	await db
		.updateTable('file')
		.set({ isDeleted: false, updatedAt: now })
		.where('id', '=', fileId)
		.execute()

	if (file.ownerId) {
		await db
			.insertInto('file_state')
			.values({ userId: file.ownerId, fileId, firstVisitAt: now, isFileOwner: true })
			.onConflict((oc) => oc.columns(['userId', 'fileId']).doNothing())
			.execute()
	}
	if (file.owningGroupId) {
		await db
			.insertInto('group_file')
			.values({ fileId, groupId: file.owningGroupId, createdAt: now, updatedAt: now })
			.onConflict((oc) => oc.columns(['fileId', 'groupId']).doNothing())
			.execute()
	}
	return { result: 'restored', file }
}
