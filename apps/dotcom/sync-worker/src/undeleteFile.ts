import { DB, TlaFile } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'

export type UndeleteFileResult =
	| { result: 'not_found' }
	| { result: 'not_deleted'; file: TlaFile }
	| { result: 'group_deleted'; file: TlaFile }
	| { result: 'restored'; file: TlaFile }

// Restores a soft-deleted file: clears isDeleted and re-creates the owning group's group_file
// link (if owningGroupId). The caller pokes the file effect processor's outbox after a
// successful restore; Zero replicates the row changes to clients on its own.
export async function undeleteFile(db: Kysely<DB>, fileId: string): Promise<UndeleteFileResult> {
	return db.transaction().execute(async (tx) => {
		const file = await tx.selectFrom('file').where('id', '=', fileId).selectAll().executeTakeFirst()
		if (!file) return { result: 'not_found' }
		if (!file.isDeleted) return { result: 'not_deleted', file }

		// owningGroupId is nullable until #10050's follow-up migration makes it NOT NULL; this
		// guard goes with it.
		if (file.owningGroupId) {
			const group = await tx
				.selectFrom('group')
				.select(['isDeleted'])
				.where('id', '=', file.owningGroupId)
				.executeTakeFirst()
			if (!group || group.isDeleted) return { result: 'group_deleted', file }
		}

		const now = Date.now()
		await tx
			.updateTable('file')
			.set({
				isDeleted: false,
				updatedAt: now,
				// Bumping lastPublished on a published file produces a publish transition, so the
				// effect re-uploads current content - otherwise the published URL stays dead until
				// the user manually republishes (restoring from trash produces no publish transition
				// of its own).
				...(file.published ? { lastPublished: now } : {}),
			})
			.where('id', '=', fileId)
			.execute()

		if (file.owningGroupId) {
			await tx
				.insertInto('group_file')
				.values({ fileId, groupId: file.owningGroupId, createdAt: now, updatedAt: now })
				.onConflict((oc) => oc.columns(['fileId', 'groupId']).doNothing())
				.execute()
		}

		return { result: 'restored', file }
	})
}
