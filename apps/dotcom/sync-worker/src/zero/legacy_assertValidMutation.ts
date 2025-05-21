import {
	MAX_NUMBER_OF_FILES,
	TlaFile,
	TlaFilePartial,
	TlaFileStatePartial,
	TlaUser,
	ZErrorCode,
	ZRowUpdate,
} from '@tldraw/dotcom-shared'
import { PoolClient } from 'pg'
import { ZMutationError } from './ZMutationError'

export async function legacy_assertValidMutation(
	userId: string,
	client: PoolClient,
	update: ZRowUpdate
) {
	switch (update.table) {
		case 'user': {
			const isUpdatingSelf = (update.row as TlaUser).id === userId
			if (!isUpdatingSelf)
				throw new ZMutationError(
					ZErrorCode.forbidden,
					'Cannot update user record that is not our own: ' + (update.row as TlaUser).id
				)
			if (update.event === 'delete') {
				throw new ZMutationError(ZErrorCode.forbidden, 'Cannot delete user record')
			}
			// todo: prevent user from updating their email?
			return
		}
		case 'file': {
			if (update.event === 'delete') {
				throw new ZMutationError(ZErrorCode.forbidden, 'Cannot delete file record')
			}
			if (update.event === 'insert') {
				const res = await client.query<{ count: number }>(
					`select count(*) from public.file where "ownerId" = $1 and "isDeleted" = false`,
					[userId]
				)
				if (res.rows[0].count >= MAX_NUMBER_OF_FILES) {
					throw new ZMutationError(
						ZErrorCode.max_files_reached,
						`Cannot create more than ${MAX_NUMBER_OF_FILES} files`
					)
				}
			}
			const nextFile = update.row as TlaFilePartial
			const res = await client.query<TlaFile>('select * from public.file where id = $1', [
				nextFile.id,
			])
			if (!res.rowCount) {
				const isOwner = nextFile.ownerId === userId
				if (isOwner) return
				throw new ZMutationError(
					ZErrorCode.forbidden,
					`Cannot create a file for another user. fileId: ${nextFile.id} file owner: ${nextFile.ownerId} current user: ${userId}`
				)
			}
			const prevFile = res.rows[0]
			if (prevFile.isDeleted)
				throw new ZMutationError(ZErrorCode.forbidden, 'Cannot update a deleted file')
			// Owners are allowed to make changes
			if (prevFile.ownerId === userId) return

			// We can make changes to updatedAt field in a shared, editable file
			if (prevFile.shared && prevFile.sharedLinkType === 'edit') {
				const { id: _id, ...rest } = nextFile
				if (Object.keys(rest).length === 1 && rest.updatedAt !== undefined) return
				throw new ZMutationError(
					ZErrorCode.forbidden,
					'Cannot update fields other than updatedAt on a shared file'
				)
			}
			throw new ZMutationError(
				ZErrorCode.forbidden,
				'Cannot update file that is not our own and not shared in edit mode' +
					` user id ${userId} ownerId ${prevFile.ownerId}`
			)
		}
		case 'file_state': {
			const nextFileState = update.row as TlaFileStatePartial
			const res = await client.query<TlaFile>(`select * from public.file where id = $1`, [
				nextFileState.fileId,
			])
			if (!res.rowCount) {
				throw new ZMutationError(ZErrorCode.bad_request, `File not found ${nextFileState.fileId}`)
			}
			if (nextFileState.userId !== userId) {
				throw new ZMutationError(
					ZErrorCode.forbidden,
					`Cannot update file state for another user ${nextFileState.userId}`
				)
			}
			const file = res.rows[0]
			if (file.ownerId === userId) return
			if (file.shared) return

			throw new ZMutationError(
				ZErrorCode.forbidden,
				"Cannot update file state of file we don't own and is not shared"
			)
		}
		default:
			// this legacy mutation validation only applies to user, file, and file_state tables
			throw new ZMutationError(
				ZErrorCode.bad_request,
				`Invalid table ${update.table} for mutation ${update.event}`
			)
	}
}
