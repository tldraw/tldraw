import type { CustomMutatorDefs } from '@rocicorp/zero'
import type { Transaction } from '@rocicorp/zero/out/zql/src/mutate/custom'
import { assert, getIndexBelow, IndexKey, sortByIndex, uniqueId } from '@tldraw/utils'
import { MAX_NUMBER_OF_FILES } from './constants'
import {
	immutableColumns,
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaFlags,
	TlaSchema,
	TlaUser,
	TlaUserPartial,
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
			createGroupFile: async (
				tx,
				{ fileId, groupId, name }: { fileId: string; groupId: string; name: string }
			) => {
				const file = await tx.query.file.where('id', '=', fileId).one().run()
				assert(!file, ZErrorCode.bad_request)
				assertValidId(fileId)
				assertValidId(groupId)
				assert(name, ZErrorCode.bad_request)
				const hasGroupAccess = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', groupId)
					.one()
					.run()
				assert(hasGroupAccess, ZErrorCode.forbidden)
				// create file row, group_file row, file_state row
				await tx.mutate.file.insert({
					id: fileId,
					name,
					ownerId: null,
					owningGroupId: groupId,
					ownerName: '',
					ownerAvatar: '',
					thumbnail: '',
					shared: true,
					sharedLinkType: 'edit',
					isEmpty: true,
					published: false,
					lastPublished: 0,
					publishedSlug: uniqueId(),
					createdAt: Date.now(),
					updatedAt: Date.now(),
					isDeleted: false,
					createSource: null,
				})
				await tx.mutate.group_file.insert({
					fileId,
					groupId,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
				await tx.mutate.file_state.insert({
					fileId,
					userId,
				})
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
			updatePinnedIndex: async (tx, { fileId, index }: { fileId: string; index: IndexKey }) => {
				assert(fileId, ZErrorCode.bad_request)
				assert(typeof index === 'string', ZErrorCode.bad_request)

				const fileState = await tx.query.file_state
					.where('userId', '=', userId)
					.where('fileId', '=', fileId)
					.one()
					.run()
				assert(fileState, ZErrorCode.bad_request)
				assert(fileState.isPinned, ZErrorCode.bad_request)

				await tx.mutate.file_state.update({
					userId,
					fileId,
					pinnedIndex: index,
				})
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
				// Get user's existing groups to determine position for new group
				const existingGroups = await tx.query.group_user.where('userId', '=', userId).run()

				// Use tldraw's fractional indexing to place new group at the top
				let index: IndexKey
				if (existingGroups.length === 0) {
					// First group gets 'a1'
					index = 'a1' as IndexKey
				} else {
					// Find the highest index and place above it using proper fractional indexing
					const sortedGroups = existingGroups.sort(sortByIndex)
					const lowest = sortedGroups[0]?.index as IndexKey | undefined
					// Generate a new index above the current highest
					index = getIndexBelow(lowest)
				}

				await tx.mutate.group_user.insert({
					userId,
					groupId: id,
					// these are set by the trigger
					userName: '',
					userColor: '#000000',
					role: 'owner',
					createdAt: Date.now(),
					updatedAt: Date.now(),
					index,
				})
			},
			update: async (tx, { id, name }: { id: string; name: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				assert(id, ZErrorCode.bad_request)
				assert(name && name.trim(), ZErrorCode.bad_request)

				// Check if user is a member of the group
				const groupUser = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', id)
					.one()
					.run()
				assert(groupUser, ZErrorCode.forbidden)

				// Only group owners can update the group name
				assert(groupUser.role === 'owner', ZErrorCode.forbidden)

				await tx.mutate.group.update({
					id,
					name: name.trim(),
					updatedAt: Date.now(),
				})
			},
			regenerateInvite: async (tx, { id }: { id: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				assert(id, ZErrorCode.bad_request)

				// Check if user is a member of the group
				const groupUser = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', id)
					.one()
					.run()
				assert(groupUser, ZErrorCode.forbidden)

				// Only group owners can regenerate invite links
				assert(groupUser.role === 'owner', ZErrorCode.forbidden)

				if (tx.location === 'server') {
					await tx.mutate.group.update({
						id,
						inviteSecret: uniqueId(),
						updatedAt: Date.now(),
					})
				}
			},
			setMemberRole: async (
				tx,
				{
					groupId,
					targetUserId,
					role,
				}: { groupId: string; targetUserId: string; role: 'admin' | 'owner' }
			) => {
				await assertUserHasFlag(tx, userId, 'groups')
				assert(groupId, ZErrorCode.bad_request)
				assert(targetUserId, ZErrorCode.bad_request)
				assert(role === 'admin' || role === 'owner', ZErrorCode.bad_request)

				// Acting user must be a member and an owner
				const actingMembership = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', groupId)
					.one()
					.run()
				assert(actingMembership, ZErrorCode.forbidden)
				assert(actingMembership.role === 'owner', ZErrorCode.forbidden)

				// Target must be a member
				const targetMembership = await tx.query.group_user
					.where('userId', '=', targetUserId)
					.where('groupId', '=', groupId)
					.one()
					.run()
				assert(targetMembership, ZErrorCode.bad_request)

				if (targetMembership.role === role) return

				// Prevent demoting the last remaining owner
				if (targetMembership.role === 'owner' && role === 'admin') {
					const users = await tx.query.group_user.where('groupId', '=', groupId).run()
					const owners = users.filter((u) => u.role === 'owner')
					assert(owners.length > 1, ZErrorCode.forbidden)
				}

				await tx.mutate.group_user.update({
					userId: targetUserId,
					groupId,
					role,
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

				// Delete all group files
				const groupFiles = await tx.query.group_file.where('groupId', '=', id).run()
				for (const groupFile of groupFiles) {
					await tx.mutate.group_file.delete({ fileId: groupFile.fileId, groupId: id })
				}

				// Mark all files owned by this group as deleted
				const files = await tx.query.file.where('owningGroupId', '=', id).run()
				for (const file of files) {
					await tx.mutate.file.update({ id: file.id, isDeleted: true })
				}

				await tx.mutate.group.update({ id: id, isDeleted: true })
				await tx.mutate.group_user.delete({ userId, groupId: id })
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
				await tx.mutate.file.update({
					id: fileId,
					owningGroupId: groupId,
					ownerId: null,
					updatedAt: Date.now(),
				})
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
			ungroupFile: async (tx, { fileId }: { fileId: string }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				assert(fileId, ZErrorCode.bad_request)
				const file = await tx.query.file.where('id', '=', fileId).one().run()
				assert(file, ZErrorCode.bad_request)
				assert(file.owningGroupId, ZErrorCode.bad_request)
				// make sure user has group access to the file
				const hasGroupAccess = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', file.owningGroupId)
					.one()
					.run()
				assert(hasGroupAccess, ZErrorCode.forbidden)
				await tx.mutate.file.update({ id: fileId, owningGroupId: null, ownerId: userId })
				await tx.mutate.group_file.delete({ fileId, groupId: file.owningGroupId })
				// todo: delete file_states for other users who no longer have access to the file?
			},
			updateIndex: async (tx, { groupId, index }: { groupId: string; index: IndexKey }) => {
				await assertUserHasFlag(tx, userId, 'groups')
				assert(groupId, ZErrorCode.bad_request)
				assert(typeof index === 'string', ZErrorCode.bad_request)
				// Check if user is a member of the group
				const groupUser = await tx.query.group_user
					.where('userId', '=', userId)
					.where('groupId', '=', groupId)
					.one()
					.run()
				assert(groupUser, ZErrorCode.forbidden)

				await tx.mutate.group_user.update({
					userId,
					groupId,
					index,
				})
			},
		},
	} as const satisfies CustomMutatorDefs<TlaSchema>
}
