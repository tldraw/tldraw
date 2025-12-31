import type { CustomMutatorDefs } from '@rocicorp/zero'
import type { Transaction } from '@rocicorp/zero/out/zql/src/mutate/custom'
import {
	assert,
	getIndexAbove,
	getIndexBelow,
	getIndexBetween,
	IndexKey,
	sortByIndex,
	sortByMaybeIndex,
	uniqueId,
} from '@tldraw/utils'
import { MAX_FAIRY_COUNT, MAX_NUMBER_OF_FILES, MAX_NUMBER_OF_GROUPS } from './constants'
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

/**
 * Parse a flags string into an array of individual flags.
 * Supports flags separated by commas, spaces, or both.
 * @param flags - The flags string to parse (e.g., "flag1,flag2" or "flag1 flag2")
 * @returns Array of individual flag strings
 */
export function parseFlags(flags: string | null | undefined): string[] {
	return flags?.split(/[,\s]+/).filter(Boolean) ?? []
}

/**
 * Check if a flags string contains a specific flag.
 * @param flags - The flags string to check
 * @param flag - The flag to look for
 * @returns true if the flag is present
 */
export function userHasFlag(flags: string | null | undefined, flag: TlaFlags): boolean {
	return parseFlags(flags).includes(flag)
}

async function assertUserHasFlag(tx: Transaction<TlaSchema>, userId: string, flag: TlaFlags) {
	const user = await tx.query.user.where('id', '=', userId).one().run()
	assert(user, ZErrorCode.bad_request)
	const flags = parseFlags(user.flags)
	assert(flags.includes(flag), ZErrorCode.forbidden)
}

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
	return userHasFlag(user?.flags, 'groups_backend')
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
	const migrated = await isGroupsMigrated(tx, userId)

	if (tx.location === 'client') {
		const files = await tx.query.file.run()
		const count = files.filter((f) => {
			if (f.isDeleted) return false
			// For migrated users, count files owned by their home group
			// For unmigrated users, count files owned directly by userId
			if (migrated) {
				return f.owningGroupId === userId
			} else {
				return f.ownerId === userId
			}
		}).length
		assert(count < MAX_NUMBER_OF_FILES, ZErrorCode.max_files_reached)
	} else {
		// On the server, don't fetch all files because we don't need them
		// Check both ownerId and owningGroupId to handle both migration states
		const rows = Array.from(
			await tx.dbTransaction.query(
				`select count(*) from "file" where "isDeleted" = false and ("ownerId" = $1 OR "owningGroupId" = $1)`,
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

async function assertUserIsGroupAdminOrOwner(
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
	assert(groupUser?.role === 'admin' || groupUser?.role === 'owner', ZErrorCode.forbidden)
}

async function assertUserIsGroupOwner(tx: Transaction<TlaSchema>, userId: string, groupId: string) {
	if (userId === groupId) return
	const groupUser = await tx.query.group_user
		.where('userId', '=', userId)
		.where('groupId', '=', groupId)
		.where('role', '=', 'owner')
		.one()
		.run()
	assert(groupUser, ZErrorCode.forbidden)
}

function assertValidId(id: string) {
	assert(id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
	assert(id.length <= 32, ZErrorCode.bad_request)
	assert(id.length >= 16, ZErrorCode.bad_request)
}

/**
 * Get user's fairy access status and limit.
 * @returns { hasAccess: boolean, limit: number }
 */
async function getUserFairyAccess(
	tx: Transaction<TlaSchema>,
	userId: string
): Promise<{ hasAccess: boolean; limit: number }> {
	// Check user_fairies table for purchased/redeemed access
	const userFairies = await tx.query.user_fairies.where('userId', '=', userId).one().run()

	const limit = userFairies?.fairyLimit ?? 0
	if (limit === 0) {
		return { hasAccess: false, limit: 0 }
	}

	// Check expiration (null = no access, number = check if still valid)
	const expiresAt = userFairies?.fairyAccessExpiresAt
	if (expiresAt === null || expiresAt === undefined || expiresAt < Date.now()) {
		return { hasAccess: false, limit: 0 }
	}

	return { hasAccess: true, limit }
}

/**
 * Assert that user has fairy access and is below their fairy limit.
 * Throws if user has no access or has reached their limit.
 * The actual limit is the minimum of the user's limit and MAX_FAIRY_COUNT.
 */
async function assertBelowFairyLimit(tx: Transaction<TlaSchema>, userId: string) {
	const { hasAccess, limit } = await getUserFairyAccess(tx, userId)

	assert(hasAccess, ZErrorCode.forbidden)
	assert(limit > 0, ZErrorCode.forbidden)

	// Count current fairies from user_fairies table
	const userFairies = await tx.query.user_fairies.where('userId', '=', userId).one().run()

	const configs = JSON.parse(userFairies?.fairies || '{}')
	const count = Object.values(configs).filter(Boolean).length

	const effectiveLimit = Math.min(limit, MAX_FAIRY_COUNT)
	assert(count < effectiveLimit, ZErrorCode.forbidden)
}

/**
 * Check if a user has the required permissions for a file.
 * @param tx - The transaction
 * @param userId - The user ID to check permissions for
 * @param file - The file to check permissions on
 * @param allowGuestAccess - If true, shared files are accessible even if user isn't owner/member
 */
async function assertUserCanAccessFileInternal(
	tx: Transaction<TlaSchema>,
	userId: string,
	file: TlaFile,
	allowGuestAccess: boolean
) {
	assert(file, ZErrorCode.bad_request)
	assert(!file.isDeleted, ZErrorCode.bad_request)

	// If shared and we allow shared access, grant access immediately
	if (allowGuestAccess && file.shared) {
		return
	}

	if (file.ownerId) {
		// Legacy model: user must own the file
		assert(file.ownerId === userId, ZErrorCode.forbidden)
	} else if (file.owningGroupId) {
		// New model: user must be a member of the owning group
		await assertUserIsGroupMember(tx, userId, file.owningGroupId)
	} else {
		// File has neither ownerId nor owningGroupId - invalid state
		assert(false, ZErrorCode.bad_request)
	}
}

/**
 * Check if a user can access (read) a file.
 * A user can access a file if:
 * - They own it (legacy model: file.ownerId matches userId)
 * - They are a member of the owning group (new model: user is in file.owningGroupId)
 * - The file is shared (regardless of ownership model)
 */
async function assertUserCanAccessFile(tx: Transaction<TlaSchema>, userId: string, file: TlaFile) {
	await assertUserCanAccessFileInternal(tx, userId, file, true)
}

/**
 * Check if a user can update (write to) a file.
 * A user can update a file if:
 * - They own it (legacy model: file.ownerId matches userId)
 * - They are a member of the owning group (new model: user is in file.owningGroupId)
 * Note: Sharing only grants read access, not write access
 */
async function assertUserCanUpdateFile(tx: Transaction<TlaSchema>, userId: string, file: TlaFile) {
	await assertUserCanAccessFileInternal(tx, userId, file, false)
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
			updateFairyConfig: async (tx, { id, properties }: { id: string; properties: object }) => {
				const current = await tx.query.user_fairies.where('userId', '=', userId).one().run()
				assert(current, ZErrorCode.forbidden) // Must have user_fairies row
				const currentConfig = JSON.parse(current?.fairies || '{}')
				const isNewFairy = !currentConfig[id]

				if (isNewFairy) {
					await assertBelowFairyLimit(tx, userId)
				} else {
					const { hasAccess } = await getUserFairyAccess(tx, userId)
					assert(hasAccess, ZErrorCode.forbidden)
				}
				await tx.mutate.user_fairies.update({
					userId,
					fairies: JSON.stringify({
						...currentConfig,
						[id]: {
							...currentConfig[id],
							...properties,
						},
					}),
				})
			},
			deleteFairyConfig: async (tx, { id }: { id: string }) => {
				const { hasAccess } = await getUserFairyAccess(tx, userId)
				assert(hasAccess, ZErrorCode.forbidden)

				const current = await tx.query.user_fairies.where('userId', '=', userId).one().run()
				assert(current, ZErrorCode.forbidden) // Must have user_fairies row
				const currentConfig = JSON.parse(current?.fairies || '{}')
				await tx.mutate.user_fairies.update({
					userId,
					fairies: JSON.stringify({ ...currentConfig, [id]: undefined }),
				})
			},
			deleteAllFairyConfigs: async (tx) => {
				const { hasAccess } = await getUserFairyAccess(tx, userId)
				assert(hasAccess, ZErrorCode.forbidden)

				const current = await tx.query.user_fairies.where('userId', '=', userId).one().run()
				assert(current, ZErrorCode.forbidden) // Must have user_fairies row
				await tx.mutate.user_fairies.update({ userId, fairies: '{}' })
			},
		},
		file: {
			/** @deprecated */
			insertWithFileState: async (
				tx,
				{ file, fileState }: { file: TlaFile; fileState: TlaFileState }
			) => {
				// User must be the owner for legacy file creation
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
				await assertUserCanUpdateFile(tx, userId, file!)

				await tx.mutate.file.update({
					..._file,
					id: file!.id,
				})
			},
		},
		file_state: {
			/** @deprecated now update creates if not exists */
			insert: async (tx, fileState: TlaFileState) => {
				assert(fileState.userId === userId, ZErrorCode.forbidden)
				if (tx.location === 'server') {
					// Verify the user has access to this file
					const file = await tx.query.file.where('id', '=', fileState.fileId).one().run()
					await assertUserCanAccessFile(tx, userId, file!)
				}
				// use upsert under the hood here for a little fault tolerance
				await tx.mutate.file_state.upsert(fileState)
			},
			update: async (tx, props: TlaFileStatePartial) => {
				const fileState = props

				assert(fileState.userId === userId, ZErrorCode.forbidden)
				disallowImmutableMutations(fileState, immutableColumns.file_state)
				if (tx.location === 'server') {
					// Verify the user has access to this file
					const file = await tx.query.file.where('id', '=', fileState.fileId).one().run()
					await assertUserCanAccessFile(tx, userId, file!)
				}
				const exists = await tx.query.file_state
					.where('fileId', '=', fileState.fileId)
					.where('userId', '=', userId)
					.one()
					.run()

				if (!exists) {
					// if the file state does not exist, do nothing
					return
				}

				await tx.mutate.file_state.upsert(fileState)
			},
			updateFairies: async (tx, { fileId, fairyState }: { fileId: string; fairyState: string }) => {
				if (tx.location !== 'server') {
					await tx.mutate.file_fairies.upsert({ fileId, userId, fairyState })
					return
				}

				const MAX_SIZE_PER_AGENT = 300 * 1024 // 300kb
				const TRUNCATE_THRESHOLD = 350 * 1024 // 350kb
				let truncatedState = fairyState

				try {
					const state = JSON.parse(fairyState)
					if (state.agents && typeof state.agents === 'object') {
						for (const aid in state.agents) {
							const agent = state.agents[aid]
							if (agent.chatHistory && Array.isArray(agent.chatHistory)) {
								const agentHistoryStr = JSON.stringify(agent.chatHistory)
								const originalSize = agentHistoryStr.length
								if (originalSize > TRUNCATE_THRESHOLD) {
									const originalCount = agent.chatHistory.length
									// Estimate how many messages to keep based on average size
									const avgSize = originalSize / originalCount
									const estimatedKeep = Math.max(1, Math.floor(MAX_SIZE_PER_AGENT / avgSize))

									// Keep estimated number (at least 1 message)
									agent.chatHistory = agent.chatHistory.slice(-estimatedKeep)
								}
							}
						}
						truncatedState = JSON.stringify(state)
					}
				} finally {
					await tx.mutate.file_fairies.upsert({ fileId, userId, fairyState: truncatedState })
				}
			},
			appendFairyChatMessage: async (
				tx,
				{ fileId, messages }: { fileId: string; messages: any[] }
			) => {
				if (messages.length === 0) {
					return
				}
				// Only insert on the backend
				if (tx.location !== 'server') return

				try {
					let now = Date.now()

					// Build batch upsert
					const values: any[] = []
					const placeholders: string[] = []
					let paramIndex = 1

					messages.forEach((item) => {
						const message = JSON.stringify(item)
						const id = item.id

						placeholders.push(
							`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`
						)
						values.push(id, fileId, userId, message, now, now)
						paramIndex += 6
						now++ // Increment to preserve order
					})

					await tx.dbTransaction.query(
						`INSERT INTO file_fairy_messages ("id", "fileId", "userId", "message", "createdAt", "updatedAt")
						VALUES ${placeholders.join(', ')}
						ON CONFLICT ("id")
						DO UPDATE SET "message" = EXCLUDED."message", "updatedAt" = EXCLUDED."updatedAt"`,
						values
					)
				} catch (e) {
					console.error('Failed to append fairy chat messages:', e)
				}
			},
		},

		/** @deprecated */
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
				index: null,
			})
			await tx.mutate.file_state.insert({
				fileId,
				userId,
				isPinned: false,
				lastEditAt: null,
				lastVisitAt: null,
				firstVisitAt: null,
				lastSessionState: null,
				// isFileOwner is no longer used in new model.
				isFileOwner: false,
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
					indexToUse = getIndexBelow(otherPinnedFiles[0]?.index) ?? ('a1' as IndexKey)
				}

				await tx.mutate.group_file.update({
					fileId,
					groupId,
					index: indexToUse,
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

			await assertUserIsGroupAdminOrOwner(tx, userId, groupId)
			const file = await tx.query.file.where('id', '=', fileId).one().run()
			assert(file, ZErrorCode.bad_request)

			await tx.mutate.file_state.delete({ fileId, userId })
			await tx.mutate.group_file.delete({ fileId, groupId })
			if (file.owningGroupId === groupId) {
				await tx.mutate.file.update({ id: fileId, isDeleted: true })
			}
		},
		onEnterFile: async (tx, { fileId, time }: { fileId: string; time: number }) => {
			assert(fileId, ZErrorCode.bad_request)
			time = ensureSensibleTimestamp(time)

			// Verify the user has permission to access this file
			if (tx.location === 'server') {
				const file = await tx.query.file.where('id', '=', fileId).one().run()
				await assertUserCanAccessFile(tx, userId, file!)
			}

			// If we get here, the user has legitimate access to the file
			await tx.mutate.file_state.upsert({ fileId, userId, firstVisitAt: time })

			const migrated = await isGroupsMigrated(tx, userId)
			if (migrated) {
				const groupFiles = await tx.query.group_file.where('fileId', '=', fileId).run()
				const userGroups = await tx.query.group_user.where('userId', '=', userId).run()
				// Only add to home group if not already in any of the user's groups
				if (!userGroups.some((g) => groupFiles.some((gf) => gf.groupId === g.groupId))) {
					await tx.mutate.group_file.insert({
						fileId,
						groupId: userId,
						createdAt: time,
						updatedAt: time,
						index: null,
					})
				}
			}
		},
		createGroup: async (tx, { id, name }: { id: string; name: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
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
			assert(existingGroups.length < MAX_NUMBER_OF_GROUPS, ZErrorCode.max_groups_reached)

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
		updateGroup: async (tx, { id, name }: { id: string; name: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(id, ZErrorCode.bad_request)
			assert(name && name.trim(), ZErrorCode.bad_request)
			await assertUserIsGroupOwner(tx, userId, id)

			await tx.mutate.group.update({ id, name: name.trim() })
		},
		regenerateGroupInviteSecret: async (tx, { id }: { id: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(id, ZErrorCode.bad_request)

			await assertUserIsGroupAdminOrOwner(tx, userId, id)

			if (tx.location === 'server') {
				await tx.mutate.group.update({ id, inviteSecret: uniqueId() })
			}
		},
		setGroupMemberRole: async (
			tx,
			{
				groupId,
				targetUserId,
				role,
			}: { groupId: string; targetUserId: string; role: 'admin' | 'owner' }
		) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			await assertUserIsGroupOwner(tx, userId, groupId)
			assert(groupId, ZErrorCode.bad_request)
			assert(targetUserId, ZErrorCode.bad_request)
			assert(role === 'admin' || role === 'owner', ZErrorCode.bad_request)

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
				const owners = await tx.query.group_user
					.where('groupId', '=', groupId)
					.where('role', '=', 'owner')
					.run()
				assert(owners.length > 1, ZErrorCode.forbidden)
			}

			await tx.mutate.group_user.update({ userId: targetUserId, groupId, role })
		},
		leaveGroup: async (tx, { groupId }: { groupId: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			const owners = await tx.query.group_user
				.where('groupId', '=', groupId)
				.where('role', '=', 'owner')
				.run()
			const isOnlyOwner = owners.length === 1 && owners[0].userId === userId
			// Prevent the last owner from leaving - they must delete the group instead
			// This ensures groups always have at least one owner for administrative purposes
			assert(!isOnlyOwner, ZErrorCode.forbidden)
			await tx.mutate.group_user.delete({ userId, groupId })
		},
		deleteGroup: async (tx, { id }: { id: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			await assertUserIsGroupOwner(tx, userId, id)

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
			// TODO: test that this works on the client and that the groups and group_users are removed
			// from the user's durable object state.
			// ALSO TODO: add special case for isDeleted becoming false in user data syncer to trigger a hard reboot
			if (tx.location !== 'server') {
				await tx.mutate.group_user.delete({ userId, groupId: id })
			}
		},
		moveFileToGroup: async (tx, { fileId, groupId }: { fileId: string; groupId: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(fileId, ZErrorCode.bad_request)
			assert(groupId, ZErrorCode.bad_request)

			const file = await tx.query.file.where('id', '=', fileId).one().run()
			assert(file, ZErrorCode.bad_request)

			// No-op if file is already in the target group
			if (file.owningGroupId === groupId) {
				return
			}

			// Check if user has permission to move this file:
			// 1. User owns the file directly, OR
			// 2. User is a member of the group that currently owns the file
			const hasFromGroupAccess = await tx.query.group_user
				.where('userId', '=', userId)
				.where('groupId', '=', file.owningGroupId!)
				.one()
				.run()

			assert(hasFromGroupAccess, ZErrorCode.forbidden)

			// User must also be a member of the target group
			const hasToGroupAccess = await tx.query.group_user
				.where('userId', '=', userId)
				.where('groupId', '=', groupId)
				.one()
				.run()
			assert(hasToGroupAccess, ZErrorCode.forbidden)

			// Remove file from current group association if it exists
			if (file.owningGroupId) {
				await tx.mutate.group_file.delete({ fileId, groupId: file.owningGroupId })
			}

			// Transfer file ownership from user to group
			await tx.mutate.file.update({
				id: fileId,
				owningGroupId: groupId,
				updatedAt: Date.now(),
			})
			await tx.mutate.group_file.insert({
				fileId,
				groupId,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				index: null,
			})
		},
		addFileLinkToGroup: async (tx, { fileId, groupId }: { fileId: string; groupId: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(fileId, ZErrorCode.bad_request)
			assert(groupId, ZErrorCode.bad_request)

			// User must be a member of the target group
			await assertUserIsGroupMember(tx, userId, groupId)

			// On server, verify the user has access to this file (owns it, is member of owning group, or it's shared)
			if (tx.location === 'server') {
				const file = await tx.query.file.where('id', '=', fileId).one().run()
				assert(file, ZErrorCode.bad_request)
				await assertUserCanAccessFile(tx, userId, file)
			}

			// Check if file link already exists
			const existing = await tx.query.group_file
				.where('fileId', '=', fileId)
				.where('groupId', '=', groupId)
				.one()
				.run()

			if (existing) {
				// Already exists, no-op
				return
			}

			// Create the file link
			await tx.mutate.group_file.insert({
				fileId,
				groupId,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				index: null,
			})
		},
		updateOwnGroupUser: async (tx, { groupId, index }: { groupId: string; index: IndexKey }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			await assertUserIsGroupMember(tx, userId, groupId)
			await tx.mutate.group_user.update({ userId, groupId, index })
		},
		handleFileDragOperation: async (
			tx,
			{
				fileId,
				groupId,
				operation,
			}: { fileId: string; groupId: string; operation: DragFileOperation }
		) => {
			// TODO: auth
			const file = await tx.query.file.where('id', '=', fileId).one().run()
			if (!file) return
			const finalGroupId = operation.move?.targetId ?? groupId
			const isFileLink = file.owningGroupId !== groupId

			// Execute move operation first (if any)
			if (finalGroupId !== groupId) {
				// Move to specific group
				if (isFileLink) {
					await tx.mutate.group_file.delete({ fileId, groupId })
					const existing = await tx.query.group_file
						.where('fileId', '=', fileId)
						.where('groupId', '=', finalGroupId)
						.one()
						.run()
					if (!existing) {
						await tx.mutate.group_file.insert({
							fileId,
							groupId: finalGroupId,
							createdAt: Date.now(),
							updatedAt: Date.now(),
						})
					}
				} else {
					await mutators.moveFileToGroup(tx, { fileId, groupId: finalGroupId })
				}
			}

			if (operation.reorder && operation.reorder.insertBeforeId !== fileId) {
				const { insertBeforeId } = operation.reorder
				let nextIndex = 'a0' as IndexKey
				if (insertBeforeId === null) {
					// insert at end
					const lastPinnedFile = (
						await tx.query.group_file.where('groupId', '=', finalGroupId).run()
					)
						.filter((f) => f.index !== null)
						.sort(sortByMaybeIndex)
						.pop()
					if (lastPinnedFile) {
						nextIndex = getIndexAbove(lastPinnedFile.index)
					}
				} else {
					// insert before specific file
					const files = (await tx.query.group_file.where('groupId', '=', finalGroupId).run())
						.filter((f) => f.index !== null)
						.sort(sortByMaybeIndex)
					const targetIdx = files.findIndex((f) => f.fileId === insertBeforeId)
					const afterIndex = files[targetIdx]?.index
					const beforeIndex = files[targetIdx - 1]?.index

					nextIndex = getIndexBetween(beforeIndex, afterIndex)
				}
				await tx.mutate.group_file.update({
					fileId,
					groupId: finalGroupId,
					index: nextIndex,
				})
			} else if (!operation.reorder) {
				await tx.mutate.group_file.update({
					fileId,
					groupId: finalGroupId,
					index: null,
					updatedAt: Date.now(),
				})
			}
		},
	} as const satisfies CustomMutatorDefs<TlaSchema>
	return mutators
}

export interface DragReorderOperation {
	insertBeforeId: string | null // file ID to insert before, null for end
	indicatorY: number
}

export interface DragFileOperation {
	move?: { targetId: string }
	reorder?: DragReorderOperation
}
export interface DragGroupOperation {
	reorder?: DragReorderOperation
}
