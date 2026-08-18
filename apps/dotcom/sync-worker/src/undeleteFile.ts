import { DB, TlaFile } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'

export type UndeleteFileResult =
	| { result: 'not_found' }
	| { result: 'not_deleted'; file: TlaFile }
	| { result: 'group_deleted'; file: TlaFile }
	| { result: 'restored'; file: TlaFile; rebootUserIds: string[] }

// Restores a soft-deleted file: clears isDeleted, re-creates the owner's file_state (if the
// file has an ownerId) and the owning group's group_file link (if owningGroupId). rebootUserIds
// is a holdover from the legacy sync engine's hard-reboot contract; the current caller
// (adminRoutes.ts) instead pokes the file effect processor's outbox after a successful restore.
export async function undeleteFile(db: Kysely<DB>, fileId: string): Promise<UndeleteFileResult> {
	return db.transaction().execute(async (tx) => {
		const file = await tx.selectFrom('file').where('id', '=', fileId).selectAll().executeTakeFirst()
		if (!file) return { result: 'not_found' }
		if (!file.isDeleted) return { result: 'not_deleted', file }

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

		if (file.ownerId) {
			await tx
				.insertInto('file_state')
				.values({ userId: file.ownerId, fileId, firstVisitAt: now, isFileOwner: true })
				.onConflict((oc) => oc.columns(['userId', 'fileId']).doNothing())
				.execute()
		}

		const rebootUserIds = new Set<string>()
		if (file.ownerId) rebootUserIds.add(file.ownerId)

		if (file.owningGroupId) {
			await tx
				.insertInto('group_file')
				.values({ fileId, groupId: file.owningGroupId, createdAt: now, updatedAt: now })
				.onConflict((oc) => oc.columns(['fileId', 'groupId']).doNothing())
				.execute()

			// Workspace members see the file in their sidebar.
			const members = await tx
				.selectFrom('group_user')
				.select('userId')
				.where('groupId', '=', file.owningGroupId)
				.execute()
			for (const member of members) rebootUserIds.add(member.userId)

			// A home workspace's group id equals its owner's user id, and the owner may not have an
			// explicit group_user row for it, so check for a matching user row too.
			const ownerAsUser = await tx
				.selectFrom('user')
				.select('id')
				.where('id', '=', file.owningGroupId)
				.executeTakeFirst()
			if (ownerAsUser) rebootUserIds.add(ownerAsUser.id)
		}

		return { result: 'restored', file, rebootUserIds: [...rebootUserIds] }
	})
}
