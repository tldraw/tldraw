import type { CustomMutatorDefs } from '@rocicorp/zero'
import type { Transaction } from '@rocicorp/zero/out/zql/src/mutate/custom'
import { assert, getIndexBelow, IndexKey, sortByMaybeIndex, uniqueId } from '@tldraw/utils'
import { MAX_NUMBER_OF_FILES } from './constants'
import {
	immutableColumns,
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
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

async function isGroupsMigrated(tx: Transaction<TlaSchema>, userId: string): Promise<boolean> {
	const user = await tx.query.user.where('id', '=', userId).one().run()
	return user?.flags?.includes('groups_backend') ?? false
}

function ensureSensibleTimestamp(time: number) {
	// if a mutation took more than 5 seconds to reach the server, or is in the future, let's use the server's time
	const now = Date.now()
	if (time < now - 5000 || time > now) {
		return now
	}
	return time
}

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

async function assertUserIsGroupMember(
	tx: Transaction<TlaSchema>,
	userId: string,
	groupId: string
) {
	if (userId === groupId) return
	const groupUser = await tx.query.group_user
		.where('userId', '=', userId)
		.where('groupId', '=', groupId)
		.one()
		.run()
	assert(groupUser, ZErrorCode.forbidden)
}

function assertValidId(id: string) {
	assert(id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
	assert(id.length <= 32, ZErrorCode.bad_request)
	assert(id.length >= 16, ZErrorCode.bad_request)
}

export function createMutators(userId: string) {
	const mutators = {
		user: {
			/** @deprecated */
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
			/** @deprecated */
			deleteOrForget: async (tx, { id }: { id: string }) => {
				const file = await tx.query.file.where('id', '=', id).one().run()
				if (!file) return
				await tx.mutate.file_state.delete({ fileId: id, userId })
				if (file.ownerId && file.ownerId === userId) {
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
				assert(file.ownerId === userId, ZErrorCode.forbidden)

				await tx.mutate.file.update({
					..._file,
					id: file.id,
				})
			},
		},
		file_state: {
			/** @deprecated now update creates if not exists */
			insert: async (tx, fileState: TlaFileState) => {
				assert(fileState.userId === userId, ZErrorCode.forbidden)
				if (tx.location === 'server') {
					// the user won't be able to see the file in the client if they are not the owner
					const file = await tx.query.file.where('id', '=', fileState.fileId).one().run()
					assert(file, ZErrorCode.bad_request)
					assert(!file.isDeleted, ZErrorCode.bad_request)
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
				if (tx.location === 'server') {
					// the user won't be able to see the file in the client if they are not the owner
					const file = await tx.query.file.where('id', '=', fileState.fileId).one().run()
					assert(file, ZErrorCode.bad_request)
					assert(!file.isDeleted, ZErrorCode.bad_request)
					if (file.ownerId) {
						assert(file.ownerId === userId || file.shared, ZErrorCode.forbidden)
					} else {
						assert(file.owningGroupId, ZErrorCode.bad_request)
						if (!file.shared) {
							await assertUserIsGroupMember(tx, userId, file.owningGroupId)
						}
					}
				}
				await tx.mutate.file_state.upsert(fileState)
			},
		},

		init: async (tx, { user, time }: { user: TlaUser; time: number }) => {
			assert(user.id === userId, ZErrorCode.forbidden)
			time = ensureSensibleTimestamp(time)
			await tx.mutate.user.insert({ ...user, flags: 'groups_backend' })
			await tx.mutate.group.insert({
				id: userId,
				name: user.name,
				createdAt: time,
				updatedAt: time,
				isDeleted: false,
				inviteSecret: null,
			})
			await tx.mutate.group_user.insert({
				userId,
				groupId: userId,
				createdAt: time,
				updatedAt: time,
				role: 'owner',
				index: 'a1' as IndexKey,
				userColor: user.color,
				userName: user.name,
			})
		},

		createFile: async (
			tx,
			{
				fileId,
				groupId,
				name,
				time,
				createSource,
			}: {
				fileId: string
				groupId: string
				name: string
				time: number
				createSource: string | null
			}
		) => {
			time = ensureSensibleTimestamp(time)
			const migrated = await isGroupsMigrated(tx, userId)
			if (!migrated) {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				await mutators.file.insertWithFileState(tx, {
					file: {
						id: fileId,
						name,
						ownerId: userId,
						owningGroupId: null,
						ownerName: '',
						ownerAvatar: '',
						thumbnail: '',
						shared: true,
						sharedLinkType: 'edit',
						published: false,
						lastPublished: 0,
						publishedSlug: uniqueId(),
						createdAt: time,
						updatedAt: time,
						isEmpty: true,
						isDeleted: false,
						createSource,
					},
					fileState: {
						userId,
						fileId,
						firstVisitAt: null,
						lastEditAt: null,
						lastSessionState: null,
						lastVisitAt: null,
						isFileOwner: true,
						isPinned: false,
					},
				})
				return
			}

			const file = await tx.query.file.where('id', '=', fileId).one().run()
			assert(!file, ZErrorCode.bad_request)
			assertValidId(fileId)
			assertValidId(groupId)
			assert(name.trim(), ZErrorCode.bad_request)
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
				createdAt: time,
				updatedAt: time,
				isDeleted: false,
				createSource,
			})
			await tx.mutate.group_file.insert({
				fileId,
				groupId,
				createdAt: time,
				updatedAt: time,
			})
			await tx.mutate.file_state.insert({
				fileId,
				userId,
			})
		},

		pinFile: async (
			tx,
			{ fileId, groupId, index }: { fileId: string; groupId: string; index?: IndexKey }
		) => {
			assert(fileId, ZErrorCode.bad_request)
			assert(typeof index === 'string' || index == null, ZErrorCode.bad_request)
			assert(groupId, ZErrorCode.bad_request)

			const migrated = await isGroupsMigrated(tx, userId)

			if (migrated) {
				assert(groupId, ZErrorCode.bad_request)
				// Migrated users: use group_file.index in home group

				let indexToUse = index
				if (indexToUse == null) {
					const otherPinnedFiles = (
						await tx.query.group_file.where('groupId', '=', userId).run()
					).filter((gf) => gf.index !== null)

					otherPinnedFiles.sort(sortByMaybeIndex)
					indexToUse = getIndexBelow(otherPinnedFiles[0].index)
				}

				await tx.mutate.group_file.update({
					fileId,
					groupId: userId,
					index,
				})
			} else {
				await tx.mutate.file_state.upsert({
					fileId,
					userId,
					isPinned: true,
					lastEditAt: Date.now(),
				})
			}
		},

		unpinFile: async (tx, { fileId, groupId }: { fileId: string; groupId: string }) => {
			assert(fileId, ZErrorCode.bad_request)

			const migrated = await isGroupsMigrated(tx, userId)

			if (migrated) {
				await tx.mutate.group_file.update({
					fileId,
					groupId,
					index: null,
				})
			} else {
				await tx.mutate.file_state.update({
					fileId,
					userId,
					isPinned: false,
				})
			}
		},

		removeFileFromGroup: async (tx, { fileId, groupId }: { fileId: string; groupId: string }) => {
			assert(fileId, ZErrorCode.bad_request)
			assert(groupId, ZErrorCode.bad_request)
			const migrated = await isGroupsMigrated(tx, userId)
			if (!migrated) {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				await mutators.file.deleteOrForget(tx, { id: fileId })
				return
			}

			await assertUserIsGroupMember(tx, userId, groupId)
			const file = await tx.query.file.where('id', '=', fileId).one().run()
			assert(file, ZErrorCode.bad_request)

			await tx.mutate.file_state.delete({ fileId, userId })
			await tx.mutate.group_file.delete({ fileId, groupId })
			if (file.owningGroupId === groupId) {
				await tx.mutate.file.update({ id: fileId, isDeleted: true })
			}
		},
	} as const satisfies CustomMutatorDefs<TlaSchema>
	return mutators
}
