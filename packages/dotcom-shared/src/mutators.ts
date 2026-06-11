import { createBuilder, type CustomMutatorDefs, type Transaction } from '@rocicorp/zero'
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
import { MAX_NUMBER_OF_FILES, MAX_NUMBER_OF_WORKSPACES } from './constants'
import { Role, can, isRole } from './roles'
import { FILE_PREFIX } from './routes'
import {
	immutableColumns,
	schema,
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaFlags,
	TlaGroupFile,
	TlaGroupUser,
	TlaSchema,
	TlaUser,
	TlaUserPartial,
} from './tlaSchema'
import { ZErrorCode } from './types'

/** Query builder for mutators - uses Zero's createBuilder API */
const zql = createBuilder(schema)

type Tx = Transaction<TlaSchema>

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
	const user = await tx.run(zql.user.where('id', '=', userId).one())
	assert(user, ZErrorCode.bad_request)
	const flags = parseFlags(user.flags)
	assert(flags.includes(flag), ZErrorCode.forbidden)
}

function disallowImmutableMutations<
	S extends TlaFilePartial | TlaFileStatePartial | TlaUserPartial,
>(data: S, immutableColumns: Set<keyof S>) {
	for (const immutableColumn of immutableColumns) {
		assert(!(immutableColumn in data), ZErrorCode.forbidden)
	}
}

export type TlaMutators = ReturnType<typeof createMutators>

async function isMigratedToWorkspaces(
	tx: Transaction<TlaSchema>,
	userId: string
): Promise<boolean> {
	const user = await tx.run(zql.user.where('id', '=', userId).one())
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
	const migrated = await isMigratedToWorkspaces(tx, userId)

	if (tx.location === 'client') {
		const files = await tx.run(zql.file)
		const count = files.filter((f: TlaFile) => {
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
		) as { count: string }[]
		assert(Number(rows[0].count) < MAX_NUMBER_OF_FILES, ZErrorCode.max_files_reached)
	}
}

/**
 * Resolve the user's role in a workspace, or null if they aren't a member. Pair it
 * with `can` from ./roles: `const role = await getRole(...); assert(can(role, 'x'))`.
 */
async function getRole(
	tx: Transaction<TlaSchema>,
	userId: string,
	workspaceId: string | null | undefined
): Promise<Role | null> {
	if (!workspaceId) return null
	// A user's personal/home workspace has an id equal to their userId; they own it.
	if (workspaceId === userId) return 'owner'
	const workspaceUser = await tx.run(
		zql.group_user.where('userId', '=', userId).where('groupId', '=', workspaceId).one()
	)
	return workspaceUser?.role ?? null
}

/**
 * The home workspace (group id === its owner's user id) is private: it can't be
 * invited to, renamed, left, deleted, or have its members managed. Throw if
 * `workspaceId` is a home workspace, i.e. a user exists with a matching id.
 */
async function assertNotHomeWorkspace(tx: Transaction<TlaSchema>, workspaceId: string) {
	const user = await tx.run(zql.user.where('id', '=', workspaceId).one())
	assert(!user, ZErrorCode.forbidden)
}

function assertValidId(id: string) {
	assert(id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
	assert(id.length <= 32, ZErrorCode.bad_request)
	assert(id.length >= 16, ZErrorCode.bad_request)
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
		// New model: user must be a member of the owning workspace
		const role = await getRole(tx, userId, file.owningGroupId)
		assert(can(role, 'accessFiles'), ZErrorCode.forbidden)
	} else {
		// File has neither ownerId nor owningGroupId - invalid state
		assert(false, ZErrorCode.bad_request)
	}
}

/**
 * Check if a user can access (read) a file.
 * A user can access a file if:
 * - They own it (legacy model: file.ownerId matches userId)
 * - They are a member of the owning workspace (new model: user is in file.owningGroupId)
 * - The file is shared (regardless of ownership model)
 */
async function assertUserCanAccessFile(tx: Transaction<TlaSchema>, userId: string, file: TlaFile) {
	await assertUserCanAccessFileInternal(tx, userId, file, true)
}

/**
 * Check if a user can update (write to) a file.
 * A user can update a file if:
 * - They own it (legacy model: file.ownerId matches userId)
 * - They are a member of the owning workspace (new model: user is in file.owningGroupId)
 * Note: Sharing only grants read access, not write access
 */
async function assertUserCanUpdateFile(tx: Transaction<TlaSchema>, userId: string, file: TlaFile) {
	await assertUserCanAccessFileInternal(tx, userId, file, false)
}

export function createMutators(userId: string) {
	const mutators = {
		user: {
			/** @deprecated */
			insert: async (tx: Tx, user: TlaUser) => {
				assert(userId === user.id, ZErrorCode.forbidden)
				await tx.mutate.user.insert(user)
			},
			update: async (tx: Tx, user: TlaUserPartial) => {
				assert(userId === user.id, ZErrorCode.forbidden)
				disallowImmutableMutations(user, immutableColumns.user)
				await tx.mutate.user.update(user)
			},
		},
		file: {
			/** @deprecated */
			deleteOrForget: async (tx: Tx, { id }: { id: string }) => {
				const file = await tx.run(zql.file.where('id', '=', id).one())
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
			update: async (tx: Tx, _file: TlaFilePartial) => {
				disallowImmutableMutations(_file, immutableColumns.file)
				const file = await tx.run(zql.file.where('id', '=', _file.id).one())
				await assertUserCanUpdateFile(tx, userId, file!)

				await tx.mutate.file.update({
					..._file,
					id: file!.id,
				})
			},
		},
		file_state: {
			/** @deprecated now update creates if not exists */
			insert: async (tx: Tx, fileState: TlaFileState) => {
				assert(fileState.userId === userId, ZErrorCode.forbidden)
				if (tx.location === 'server') {
					// Verify the user has access to this file
					const file = await tx.run(zql.file.where('id', '=', fileState.fileId).one())
					await assertUserCanAccessFile(tx, userId, file!)
				}
				// use upsert under the hood here for a little fault tolerance
				await tx.mutate.file_state.upsert(fileState)
			},
			update: async (tx: Tx, props: TlaFileStatePartial) => {
				const fileState = props

				assert(fileState.userId === userId, ZErrorCode.forbidden)
				disallowImmutableMutations(fileState, immutableColumns.file_state)
				if (tx.location === 'server') {
					// Verify the user has access to this file
					const file = await tx.run(zql.file.where('id', '=', fileState.fileId).one())
					await assertUserCanAccessFile(tx, userId, file!)
				}
				const exists = await tx.run(
					zql.file_state.where('fileId', '=', fileState.fileId).where('userId', '=', userId).one()
				)

				if (!exists) {
					// if the file state does not exist, do nothing
					return
				}

				await tx.mutate.file_state.upsert(fileState)
			},
		},

		/** @deprecated */
		init: async (tx: Tx, { user, time }: { user: TlaUser; time: number }) => {
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
			tx: Tx,
			{
				fileId,
				workspaceId,
				name,
				time,
				createSource,
			}: {
				fileId: string
				workspaceId: string
				name: string
				time: number
				createSource: string | null
			}
		) => {
			time = ensureSensibleTimestamp(time)

			// Security: when a new file is seeded from another app file (the Duplicate
			// action sets `createSource` to `${FILE_PREFIX}/${sourceFileId}`), the user
			// must be able to read that source file. The content copy happens later in
			// the worker (handleFileCreateFromSource), which trusts `createSource`
			// verbatim, so the authorization has to happen here at creation time.
			// Without this, a user who can still see a file they've lost access to — or
			// who merely knows its id — could duplicate it and obtain an owned, editable
			// copy of content they cannot read. Checked on the server only, matching the
			// other file-access checks in this file (the optimistic client run may not
			// have the source file synced). Other `createSource` prefixes (published,
			// legacy rooms, local files) are intentionally not gated here.
			if (tx.location === 'server' && createSource) {
				const [prefix, sourceFileId] = createSource.split('/')
				if (prefix === FILE_PREFIX) {
					const sourceFile = await tx.run(zql.file.where('id', '=', sourceFileId).one())
					await assertUserCanAccessFile(tx, userId, sourceFile!)
				}
			}

			const migrated = await isMigratedToWorkspaces(tx, userId)
			if (!migrated) {
				// Legacy (user-owned) file creation. ownerId, id and the file_state
				// keys are constructed here to match userId/fileId, so the only checks
				// that can fail are the file limit and id validity (createSource was
				// gated above).
				await assertNotMaxFiles(tx, userId)
				assertValidId(fileId)
				await tx.mutate.file.insert({
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
				})
				await tx.mutate.file_state.upsert({
					userId,
					fileId,
					firstVisitAt: null,
					lastEditAt: null,
					lastSessionState: null,
					lastVisitAt: null,
					isFileOwner: true,
					isPinned: false,
				})
				return
			}

			const file = await tx.run(zql.file.where('id', '=', fileId).one())
			assert(!file, ZErrorCode.bad_request)
			assertValidId(fileId)
			assertValidId(workspaceId)
			assert(name.trim(), ZErrorCode.bad_request)
			const hasWorkspaceAccess = await tx.run(
				zql.group_user.where('userId', '=', userId).where('groupId', '=', workspaceId).one()
			)
			assert(hasWorkspaceAccess, ZErrorCode.forbidden)

			// create file row, group_file row, file_state row
			await tx.mutate.file.insert({
				id: fileId,
				name,
				ownerId: null,
				owningGroupId: workspaceId,
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
				groupId: workspaceId,
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
			tx: Tx,
			{ fileId, workspaceId, index }: { fileId: string; workspaceId: string; index?: IndexKey }
		) => {
			assert(fileId, ZErrorCode.bad_request)
			assert(typeof index === 'string' || index == null, ZErrorCode.bad_request)
			assert(workspaceId, ZErrorCode.bad_request)

			const migrated = await isMigratedToWorkspaces(tx, userId)

			if (migrated) {
				// Migrated users: pinned files are group_file rows with a non-null index.
				// New pins go above the workspace's current top pinned file.
				let indexToUse = index
				if (indexToUse == null) {
					const allWorkspaceFiles = await tx.run(zql.group_file.where('groupId', '=', workspaceId))
					const otherPinnedFiles = allWorkspaceFiles.filter((gf: TlaGroupFile) => gf.index !== null)

					otherPinnedFiles.sort(sortByMaybeIndex)
					indexToUse = getIndexBelow(otherPinnedFiles[0]?.index) ?? ('a1' as IndexKey)
				}

				await tx.mutate.group_file.update({
					fileId,
					groupId: workspaceId,
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

		unpinFile: async (tx: Tx, { fileId, workspaceId }: { fileId: string; workspaceId: string }) => {
			assert(fileId, ZErrorCode.bad_request)

			const migrated = await isMigratedToWorkspaces(tx, userId)

			if (migrated) {
				await tx.mutate.group_file.update({
					fileId,
					groupId: workspaceId,
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

		removeFileFromWorkspace: async (
			tx: Tx,
			{ fileId, workspaceId }: { fileId: string; workspaceId: string }
		) => {
			assert(fileId, ZErrorCode.bad_request)
			assert(workspaceId, ZErrorCode.bad_request)
			const migrated = await isMigratedToWorkspaces(tx, userId)
			if (!migrated) {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				await mutators.file.deleteOrForget(tx, { id: fileId })
				return
			}

			const role = await getRole(tx, userId, workspaceId)
			assert(can(role, 'removeFiles'), ZErrorCode.forbidden)
			const file = await tx.run(zql.file.where('id', '=', fileId).one())
			assert(file, ZErrorCode.bad_request)

			await tx.mutate.file_state.delete({ fileId, userId })
			await tx.mutate.group_file.delete({ fileId, groupId: workspaceId })
			if (file.owningGroupId === workspaceId) {
				await tx.mutate.file.update({ id: fileId, isDeleted: true })
			}
		},
		onEnterFile: async (tx: Tx, { fileId, time }: { fileId: string; time: number }) => {
			assert(fileId, ZErrorCode.bad_request)
			time = ensureSensibleTimestamp(time)

			// Verify the user has permission to access this file
			if (tx.location === 'server') {
				const file = await tx.run(zql.file.where('id', '=', fileId).one())
				await assertUserCanAccessFile(tx, userId, file!)
			}

			// If we get here, the user has legitimate access to the file
			await tx.mutate.file_state.upsert({ fileId, userId, firstVisitAt: time })

			const migrated = await isMigratedToWorkspaces(tx, userId)
			if (migrated) {
				const workspaceFileRows = await tx.run(zql.group_file.where('fileId', '=', fileId))
				const userWorkspaceMemberships = await tx.run(zql.group_user.where('userId', '=', userId))
				// Only add to home group if not already in any of the user's groups
				if (
					!userWorkspaceMemberships.some((g: TlaGroupUser) =>
						workspaceFileRows.some((gf: TlaGroupFile) => gf.groupId === g.groupId)
					)
				) {
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
		createWorkspace: async (tx: Tx, { id, name }: { id: string; name: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assertValidId(id)

			// Enforce the workspace limit before creating anything.
			const existingWorkspaces = await tx.run(zql.group_user.where('userId', '=', userId))
			assert(
				existingWorkspaces.length < MAX_NUMBER_OF_WORKSPACES,
				ZErrorCode.max_workspaces_reached
			)

			await tx.mutate.group.insert({
				id,
				name,
				inviteSecret: tx.location === 'server' ? uniqueId() : null,
				isDeleted: false,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			})

			// Use tldraw's fractional indexing to place the new workspace at the top
			// (the workspace list sorts ascending, so the lowest index renders first)
			let index: IndexKey
			if (existingWorkspaces.length === 0) {
				// First workspace gets 'a1'
				index = 'a1' as IndexKey
			} else {
				const sortedWorkspaces = existingWorkspaces.sort(sortByIndex)
				const lowest = sortedWorkspaces[0]?.index as IndexKey | undefined
				// Generate a new index below the current lowest
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
		updateWorkspace: async (tx: Tx, { id, name }: { id: string; name: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(id, ZErrorCode.bad_request)
			assert(name && name.trim(), ZErrorCode.bad_request)
			await assertNotHomeWorkspace(tx, id)
			const role = await getRole(tx, userId, id)
			assert(can(role, 'editWorkspace'), ZErrorCode.forbidden)

			await tx.mutate.group.update({ id, name: name.trim() })
		},
		regenerateWorkspaceInviteSecret: async (tx: Tx, { id }: { id: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(id, ZErrorCode.bad_request)
			await assertNotHomeWorkspace(tx, id)

			const role = await getRole(tx, userId, id)
			assert(can(role, 'manageInvites'), ZErrorCode.forbidden)

			if (tx.location === 'server') {
				await tx.mutate.group.update({ id, inviteSecret: uniqueId() })
			}
		},
		setWorkspaceMemberRole: async (
			tx: Tx,
			{
				workspaceId,
				targetUserId,
				role: targetRole,
			}: { workspaceId: string; targetUserId: string; role: Role }
		) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(workspaceId, ZErrorCode.bad_request)
			assert(targetUserId, ZErrorCode.bad_request)
			assert(isRole(targetRole), ZErrorCode.bad_request)
			await assertNotHomeWorkspace(tx, workspaceId)

			const role = await getRole(tx, userId, workspaceId)
			assert(can(role, 'editMembers'), ZErrorCode.forbidden)

			// Target must be a member
			const targetMembership = await tx.run(
				zql.group_user.where('userId', '=', targetUserId).where('groupId', '=', workspaceId).one()
			)
			assert(targetMembership, ZErrorCode.bad_request)

			if (targetMembership.role === targetRole) return

			// Invariant (not a capability): a group must always keep at least one
			// owner, so the last owner can't be demoted away from owner.
			if (targetMembership.role === 'owner' && targetRole !== 'owner') {
				const owners = await tx.run(
					zql.group_user.where('groupId', '=', workspaceId).where('role', '=', 'owner')
				)
				assert(owners.length > 1, ZErrorCode.forbidden)
			}

			await tx.mutate.group_user.update({
				userId: targetUserId,
				groupId: workspaceId,
				role: targetRole,
			})
		},
		leaveWorkspace: async (tx: Tx, { workspaceId }: { workspaceId: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(workspaceId, ZErrorCode.bad_request)
			await assertNotHomeWorkspace(tx, workspaceId)
			const owners = await tx.run(
				zql.group_user.where('groupId', '=', workspaceId).where('role', '=', 'owner')
			)
			const isOnlyOwner = owners.length === 1 && owners[0].userId === userId
			// Invariant (not a capability): a group must always keep at least one
			// owner, so the last owner can't leave — they must delete the group instead.
			assert(!isOnlyOwner, ZErrorCode.forbidden)
			await tx.mutate.group_user.delete({ userId, groupId: workspaceId })
		},
		deleteWorkspace: async (tx: Tx, { id }: { id: string }) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(id, ZErrorCode.bad_request)
			await assertNotHomeWorkspace(tx, id)
			const role = await getRole(tx, userId, id)
			assert(can(role, 'deleteWorkspace'), ZErrorCode.forbidden)

			// Delete all workspace files
			const workspaceFileRows = await tx.run(zql.group_file.where('groupId', '=', id))
			for (const workspaceFile of workspaceFileRows) {
				await tx.mutate.group_file.delete({ fileId: workspaceFile.fileId, groupId: id })
			}

			// Mark all files owned by this workspace as deleted
			const files = await tx.run(zql.file.where('owningGroupId', '=', id))
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
		moveFileToWorkspace: async (
			tx: Tx,
			{ fileId, workspaceId }: { fileId: string; workspaceId: string }
		) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(fileId, ZErrorCode.bad_request)
			assert(workspaceId, ZErrorCode.bad_request)

			const file = await tx.run(zql.file.where('id', '=', fileId).one())
			assert(file, ZErrorCode.bad_request)

			// No-op if file is already in the target workspace
			if (file.owningGroupId === workspaceId) {
				return
			}

			// User must be allowed to take the file out of its current workspace and
			// to add files to the destination workspace.
			const fromRole = await getRole(tx, userId, file.owningGroupId)
			assert(can(fromRole, 'removeFiles'), ZErrorCode.forbidden)
			const toRole = await getRole(tx, userId, workspaceId)
			assert(can(toRole, 'addFiles'), ZErrorCode.forbidden)

			// Remove file from current group association if it exists
			if (file.owningGroupId) {
				await tx.mutate.group_file.delete({ fileId, groupId: file.owningGroupId })
			}

			// Transfer file ownership from user to group
			await tx.mutate.file.update({
				id: fileId,
				owningGroupId: workspaceId,
				updatedAt: Date.now(),
			})
			await tx.mutate.group_file.insert({
				fileId,
				groupId: workspaceId,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				index: null,
			})
		},
		handleFileDragOperation: async (
			tx: Tx,
			{
				fileId,
				workspaceId,
				operation,
			}: { fileId: string; workspaceId: string; operation: DragFileOperation }
		) => {
			await assertUserHasFlag(tx, userId, 'groups_backend')
			assert(fileId, ZErrorCode.bad_request)
			assert(workspaceId, ZErrorCode.bad_request)
			const file = await tx.run(zql.file.where('id', '=', fileId).one())
			if (!file) return
			await assertUserCanAccessFile(tx, userId, file)
			const role = await getRole(tx, userId, workspaceId)
			assert(can(role, 'addFiles'), ZErrorCode.forbidden)
			const finalWorkspaceId = operation.move?.targetId ?? workspaceId
			if (finalWorkspaceId !== workspaceId) {
				const finalRole = await getRole(tx, userId, finalWorkspaceId)
				assert(can(finalRole, 'addFiles'), ZErrorCode.forbidden)
			}
			const isFileLink = file.owningGroupId !== workspaceId

			// Execute move operation first (if any)
			if (finalWorkspaceId !== workspaceId) {
				// Move to specific group
				if (isFileLink) {
					await tx.mutate.group_file.delete({ fileId, groupId: workspaceId })
					const existing = await tx.run(
						zql.group_file
							.where('fileId', '=', fileId)
							.where('groupId', '=', finalWorkspaceId)
							.one()
					)
					if (!existing) {
						await tx.mutate.group_file.insert({
							fileId,
							groupId: finalWorkspaceId,
							createdAt: Date.now(),
							updatedAt: Date.now(),
						})
					}
				} else {
					await mutators.moveFileToWorkspace(tx, { fileId, workspaceId: finalWorkspaceId })
				}
			}

			if (operation.reorder && operation.reorder.insertBeforeId !== fileId) {
				const { insertBeforeId } = operation.reorder
				let nextIndex = 'a0' as IndexKey
				if (insertBeforeId === null) {
					// insert at end
					const lastPinnedFile = (
						await tx.run(zql.group_file.where('groupId', '=', finalWorkspaceId))
					)
						.filter((f) => f.index !== null)
						.sort(sortByMaybeIndex)
						.pop()
					if (lastPinnedFile) {
						nextIndex = getIndexAbove(lastPinnedFile.index)
					}
				} else {
					// insert before specific file
					const files = (await tx.run(zql.group_file.where('groupId', '=', finalWorkspaceId)))
						.filter((f) => f.index !== null)
						.sort(sortByMaybeIndex)
					const targetIdx = files.findIndex((f) => f.fileId === insertBeforeId)
					const afterIndex = files[targetIdx]?.index
					const beforeIndex = files[targetIdx - 1]?.index

					nextIndex = getIndexBetween(beforeIndex, afterIndex)
				}
				await tx.mutate.group_file.update({
					fileId,
					groupId: finalWorkspaceId,
					index: nextIndex,
				})
			} else if (!operation.reorder) {
				await tx.mutate.group_file.update({
					fileId,
					groupId: finalWorkspaceId,
					index: null,
					updatedAt: Date.now(),
				})
			}
		},
	} as const satisfies CustomMutatorDefs
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
