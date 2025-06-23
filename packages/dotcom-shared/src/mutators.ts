import type { CustomMutatorDefs } from '@rocicorp/zero'
import type { Transaction } from '@rocicorp/zero/out/zql/src/mutate/custom'
import { assert, uniqueId } from '@tldraw/utils'
import { MAX_NUMBER_OF_FILES } from './constants'
import {
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaFlags,
	TlaSchema,
	TlaUser,
	TlaUserPartial,
	immutableColumns,
} from './tlaSchema'
import { ZErrorCode } from './types'

function disallowImmutableMutations<
	S extends TlaFilePartial | TlaFileStatePartial | TlaUserPartial,
>(data: S, immutableColumns: Set<keyof S>) {
	for (const immutableColumn of immutableColumns) {
		assert(!data[immutableColumn], ZErrorCode.forbidden)
	}
}

export type TlaMutators = ReturnType<typeof createMutators>

async function assertNotMaxFiles(tx: Transaction<TlaSchema>, userId: string) {
	if (tx.location === 'client') {
		const count = (await tx.query.file.where('ownerId', '=', userId).run()).filter(
			(f) => !f.isDeleted
		).length
		assert(count < MAX_NUMBER_OF_FILES, ZErrorCode.max_files_reached)
	} else {
		// On the server, don't fetch all files because we don't need them
		const rows = Array.from(
			await tx.dbTransaction.query(
				`select count(*) from "file" where "ownerId" = $1 and "isDeleted" = false`,
				[userId]
			)
		) as { count: number }[]
		assert(rows[0].count < MAX_NUMBER_OF_FILES, ZErrorCode.max_files_reached)
	}
}

async function assertUserHasFlag(tx: Transaction<TlaSchema>, userId: string, flag: TlaFlags) {
	const user = await tx.query.user.where('id', '=', userId).one().run()
	assert(user, ZErrorCode.bad_request)
	const flags = user.flags?.split(',') ?? []
	assert(flags.includes(flag), ZErrorCode.forbidden)
}

function assertValidId(id: string) {
	assert(id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
	assert(id.length <= 32, ZErrorCode.bad_request)
	assert(id.length >= 16, ZErrorCode.bad_request)
}

export function createMutators(userId: string) {
	return {
		user: {
			insert: async (tx, user: TlaUser) => {
				assert(userId === user.id, ZErrorCode.forbidden)
				await tx.mutate.user.insert(user)
			},
			update: async (tx, user: TlaUserPartial) => {
				assert(userId === user.id, ZErrorCode.forbidden)
				disallowImmutableMutations(user, immutableColumns.user)
				await tx.mutate.user.update(user)
			},
		},
		file: {
			insertWithFileState: async (
				tx,
				{ file, fileState }: { file: TlaFile; fileState: TlaFileState }
			) => {
				assert(file.ownerId === userId, ZErrorCode.forbidden)
				await assertNotMaxFiles(tx, userId)
				assertValidId(file.id)
				assert(file.id === fileState.fileId, ZErrorCode.bad_request)
				assert(fileState.userId === userId, ZErrorCode.forbidden)

				await tx.mutate.file.insert(file)
				await tx.mutate.file_state.upsert(fileState)
			},
			deleteOrForget: async (tx, file: TlaFile) => {
				await tx.mutate.file_state.delete({ fileId: file.id, userId })
				if (file?.ownerId === userId) {
					if (tx.location === 'server') {
						// todo: use a sql trigger for this like we do for setting shared to false
						await tx.dbTransaction.query(`delete from public.file_state where "fileId" = $1`, [
							file.id,
						])
					}
					await tx.mutate.file.update({
						id: file.id,
						ownerId: file.ownerId,
						publishedSlug: file.publishedSlug,
						isDeleted: true,
					})
				}
			},
			update: async (tx, _file: TlaFilePartial) => {
				disallowImmutableMutations(_file, immutableColumns.file)
				const file = await tx.query.file.where('id', '=', _file.id).one().run()
				assert(file, ZErrorCode.bad_request)
				assert(!file.isDeleted, ZErrorCode.bad_request)
				const isOwner = file.ownerId === userId
				const hasGroupAccess =
					!isOwner && file.owningGroupId
						? await tx.query.group_user
								.where('userId', '=', userId)
								.where('groupId', '=', file.owningGroupId)
								.one()
								.run()
						: false
				assert(isOwner || hasGroupAccess, ZErrorCode.forbidden)

				await tx.mutate.file.update({
					..._file,
					id: file.id,
					ownerId: file.ownerId,
					publishedSlug: file.publishedSlug,
				})
			},
		},
		file_state: {
			insert: async (tx, fileState: TlaFileState) => {
				assert(fileState.userId === userId, ZErrorCode.forbidden)
				if (tx.location === 'server') {
					// the user won't be able to see the file in the client if they are not the owner
					const file = await tx.query.file.where('id', '=', fileState.fileId).one().run()
					assert(file, ZErrorCode.bad_request)
					if (file?.ownerId !== userId) {
						assert(file?.shared, ZErrorCode.forbidden)
					}
				}
				// use upsert under the hood here for a little fault tolerance
				await tx.mutate.file_state.upsert(fileState)
			},
			update: async (tx, fileState: TlaFileStatePartial) => {
				assert(fileState.userId === userId, ZErrorCode.forbidden)
				disallowImmutableMutations(fileState, immutableColumns.file_state)
				await tx.mutate.file_state.update(fileState)
			},
			delete: async (tx, fileState: { fileId: string; userId: string }) => {
				assert(fileState.userId === userId, ZErrorCode.forbidden)
				await tx.mutate.file_state.delete({ fileId: fileState.fileId, userId: fileState.userId })
			},
		},
		group: {
			create: async (tx, { id, name }: { id: string; name: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				assertValidId(id)
				await tx.mutate.group.insert({
					id,
					name,
					inviteSecret: tx.location === 'server' ? uniqueId() : null,
					isDeleted: false,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
				await tx.mutate.group_user.insert({
					userId,
					groupId: id,
					// these are set by the trigger
					userName: '',
					userEmail: '',
					role: 'owner',
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
			},
			leave: async (tx, { groupId }: { groupId: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				const users = await tx.query.group_user.where('groupId', '=', groupId).run()
				const owners = users.filter((u) => u.role === 'owner')
				const isOwner = owners.some((u) => u.userId === userId)
				// if the user is the only owner, they can't leave they have to delete
				assert(!isOwner || owners.length > 1, ZErrorCode.forbidden)
				await tx.mutate.group_user.delete({ userId, groupId })
				// delete any file states for this group's files ?
			},
			delete: async (tx, { id }: { id: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				const groupUser = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', id)
					.one()
					.run()
				assert(groupUser, ZErrorCode.forbidden)
				assert(groupUser.role === 'owner', ZErrorCode.forbidden)
				const groupOwnedFiles = await tx.query.file.where('owningGroupId', '=', id).run()
				// the group_file and group_user tables should be cleaned up via cascade
				for (const file of groupOwnedFiles) {
					await tx.mutate.file.update({ id: file.id, isDeleted: true })
				}
				await tx.mutate.group.update({ id: id, isDeleted: true })
				if (tx.location === 'server') {
					await tx.dbTransaction.query(`delete from public.group_user where "groupId" = $1`, [id])
					await tx.dbTransaction.query(`delete from public.group_file where "groupId" = $1`, [id])
				}
			},
			acceptInvite: async (tx, { inviteSecret }: { inviteSecret: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				// It only makes sense to run this on the server because the user doesn't have the
				// group data on the client yet.
				if (tx.location === 'client') return
				const group = await tx.query.group.where('inviteSecret', '=', inviteSecret).one().run()
				assert(group, ZErrorCode.bad_request)
				await tx.mutate.group_user.insert({
					userId,
					groupId: group.id,
					userName: '',
					userEmail: '',
					role: 'admin',
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
			},
			moveFileToGroup: async (tx, { fileId, groupId }: { fileId: string; groupId: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				assert(fileId, ZErrorCode.bad_request)
				assert(groupId, ZErrorCode.bad_request)
				// if the user owns the file, we can move it
				// if the user has access to a group which owns the file we can move
				const file = await tx.query.file.where('id', '=', fileId).one().run()
				assert(file, ZErrorCode.bad_request)
				const isOwner = file.ownerId === userId
				const hasFromGroupAccess =
					!isOwner && file.owningGroupId
						? await tx.query.group_user
								.where('userId', '=', userId)
								.where('groupId', '=', file.owningGroupId)
								.one()
								.run()
						: false

				assert(isOwner || hasFromGroupAccess, ZErrorCode.forbidden)
				// also needs toGroupAccess
				const hasToGroupAccess = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', groupId)
					.one()
					.run()
				assert(hasToGroupAccess, ZErrorCode.forbidden)

				// if the file is already in the group, we can move it
				if (file.owningGroupId === groupId) {
					return
				}

				// if the file is in a group, we need to remove it from the group
				if (file.owningGroupId) {
					await tx.mutate.group_file.delete({ fileId, groupId: file.owningGroupId })
				}

				await tx.mutate.file.update({ id: fileId, owningGroupId: groupId, ownerId: null })
				await tx.mutate.group_file.insert({
					fileId,
					groupId,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
			},
			linkFileInGroup: async (tx, { fileId, groupId }: { fileId: string; groupId: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				assert(fileId, ZErrorCode.bad_request)
				assert(groupId, ZErrorCode.bad_request)
				const file = await tx.query.file.where('id', '=', fileId).one().run()
				assert(file, ZErrorCode.bad_request)
				assert(file.shared, ZErrorCode.bad_request)
				assert(file.owningGroupId !== groupId, ZErrorCode.bad_request)
				await tx.mutate.group_file.insert({
					fileId,
					groupId,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
			},
		},
	} as const satisfies CustomMutatorDefs<TlaSchema>
}
