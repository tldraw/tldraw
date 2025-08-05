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
				assert(file.owningGroupId === null, ZErrorCode.bad_request)
				assert(file.isDeleted === false, ZErrorCode.bad_request)
				await assertNotMaxFiles(tx, userId)
				assertValidId(file.id)
				assert(file.id === fileState.fileId, ZErrorCode.bad_request)
				assert(fileState.userId === userId, ZErrorCode.forbidden)

				await tx.mutate.file.insert(file)
				await tx.mutate.file_state.insert(fileState)
			},
			deleteOrForget: async (tx, { fileId }: { fileId: string }) => {
				const file = await tx.query.file.where('id', '=', fileId).one().run()
				assert(file, ZErrorCode.bad_request)
				await tx.mutate.file_state.delete({ fileId, userId })
				if (file.ownerId === userId) {
					await tx.mutate.file.update({
						id: file.id,
						isDeleted: true,
					})
					// other file_states and group_files will be cleaned up via trigger
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

				// don't allow changing ownership in this mutator
				if ('ownerId' in _file) {
					assert(_file.ownerId === file.ownerId, ZErrorCode.forbidden)
				}
				if ('owningGroupId' in _file) {
					assert(_file.owningGroupId === file.owningGroupId, ZErrorCode.forbidden)
				}

				await tx.mutate.file.update({
					..._file,
					id: file.id,
				})
			},
		},
		file_state: {
			insert: async (tx, fileState: TlaFileState) => {
				assert(fileState.userId === userId, ZErrorCode.forbidden)
				if (tx.location === 'server') {
					// Server-side validation: ensure user has access to the file before allowing file_state creation
					const file = await tx.query.file.where('id', '=', fileState.fileId).one().run()
					assert(file, ZErrorCode.bad_request)
					assert(file.isDeleted === false, ZErrorCode.bad_request)

					if (file.ownerId) {
						// File is owned by a user - check if current user is the owner or file is shared
						assert(file.ownerId === userId || file.shared, ZErrorCode.forbidden)
					} else {
						// File is owned by a group - verify user is a member of the owning group
						assert(file.owningGroupId, ZErrorCode.unknown_error)
						const groupUser = await tx.query.group_user
							.where('userId', '=', userId)
							.where('groupId', '=', file.owningGroupId)
							.one()
							.run()
						assert(groupUser, ZErrorCode.forbidden)
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
				// Prevent the last owner from leaving - they must delete the group instead
				// This ensures groups always have at least one owner for administrative purposes
				assert(!isOwner || owners.length > 1, ZErrorCode.forbidden)
				await tx.mutate.group_user.delete({ userId, groupId })
			},
			delete: async (tx, { id }: { id: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				const groupUser = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', id)
					.one()
					.run()
				assert(groupUser, ZErrorCode.forbidden)
				// Only group owners can delete the group - admins cannot
				assert(groupUser.role === 'owner', ZErrorCode.forbidden)

				if (tx.location === 'server') {
					await tx.mutate.group.update({ id: id, isDeleted: true })
					// everything else will be cleaned up via triggers
				} else {
					// on the client, we can just delete the group
					// and wait for the server to clean up and propagate the rest of the changes
					await tx.mutate.group.delete({ id })
					await tx.mutate.group_user.delete({ userId, groupId: id })
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

				const file = await tx.query.file.where('id', '=', fileId).one().run()
				assert(file, ZErrorCode.bad_request)

				// Check if user has permission to move this file:
				// 1. User owns the file directly, OR
				// 2. User is a member of the group that currently owns the file
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

				// User must also be a member of the target group
				const hasToGroupAccess = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', groupId)
					.one()
					.run()
				assert(hasToGroupAccess, ZErrorCode.forbidden)

				// No-op if file is already in the target group
				if (file.owningGroupId === groupId) {
					return
				}

				// Remove file from current group association if it exists
				if (file.owningGroupId) {
					await tx.mutate.group_file.delete({ fileId, groupId: file.owningGroupId })
				}

				// Transfer file ownership from user to group
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
