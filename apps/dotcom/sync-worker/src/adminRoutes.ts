import { FeatureFlagKey, TlaFile } from '@tldraw/dotcom-shared'
import { assert, retry, sleep, uniqueId } from '@tldraw/utils'
import { createRouter } from '@tldraw/worker-shared'
import { StatusError, json } from 'itty-router'
import { sql } from 'kysely'
import { createPostgresConnectionPool } from './postgres'
import { returnFileSnapshot } from './routes/tla/getFileSnapshot'
import { type Environment } from './types'
import { getReplicator, getRoomDurableObject, getUserDurableObject } from './utils/durableObjects'
import { FEATURE_FLAG_KEYS, getFeatureFlagsAdmin, setFeatureFlag } from './utils/featureFlags'
import { getClerkClient, requireAdminAccess, requireAuth } from './utils/tla/getAuth'
import {
	computeUsersToEnroll,
	computeUsersToUnenroll,
	enrollUsersInWorkspacesUi,
	unenrollUsersFromWorkspacesUi,
} from './utils/workspacesUiRollout'

async function requireUser(env: Environment, q: string) {
	const db = createPostgresConnectionPool(env, '/app/admin/user')
	const userRow = await db
		.selectFrom('user')
		.where((eb) => eb.or([eb('email', '=', q), eb('id', '=', q)]))
		.selectAll()
		.executeTakeFirst()

	if (!userRow) {
		throw new StatusError(404, 'User not found ' + q)
	}
	return userRow
}

export const adminRoutes = createRouter<Environment>()
	.all('/app/admin/*', async (req, env) => {
		const auth = await requireAuth(req, env)
		await requireAdminAccess(env, auth)
	})
	.get('/app/admin/user', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)

		const user = getUserDurableObject(env, userRow.id)
		return json(await user.admin_getData(userRow.id))
	})
	.get('/app/admin/replicator', async (res, env) => {
		const replicator = getReplicator(env)
		const diagnostics = await replicator.getDiagnostics()
		return json(diagnostics)
	})
	.post('/app/admin/user/reboot', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)
		const user = getUserDurableObject(env, userRow.id)
		await user.admin_forceHardReboot(userRow.id)
		return new Response('Rebooted', { status: 200 })
	})
	.post('/app/admin/user/migrate', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)
		const user = getUserDurableObject(env, userRow.id)
		const result = await user.admin_migrateToGroups(userRow.id, uniqueId())
		return json(result)
	})
	.post('/app/admin/user/enroll_groups', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)
		const user = getUserDurableObject(env, userRow.id)
		const result = await user.admin_enrollInGroups(userRow.id)
		return json(result)
	})
	.post('/app/admin/user/unenroll_groups', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)
		const user = getUserDurableObject(env, userRow.id)
		const result = await user.admin_unenrollFromGroups(userRow.id)
		return json(result)
	})
	.get('/app/admin/unmigrated_users_count', async (_res, env) => {
		const pg = createPostgresConnectionPool(env, '/app/admin/unmigrated_users_count')
		const count = await getNumUnenrolledUsers(pg)
		const total = await getTotalUsers(pg)
		return json({ count, total })
	})
	.get('/app/admin/migrate_users_batch', async (res, env) => {
		let stopRequested = false

		// Parse query parameters for batch configuration
		const sleepMs = parseInt((res.query['sleepMs'] as string) || '100')
		if (isNaN(sleepMs) || sleepMs < 0) {
			throw new StatusError(400, 'sleepMs must be a non-negative number')
		}
		const percentage = parseInt((res.query['percentage'] as string) || '0')
		if (isNaN(percentage) || percentage < 0 || percentage > 100) {
			throw new StatusError(400, 'percentage must be a number between 0 and 100')
		}

		return new Response(
			new ReadableStream({
				async start(controller) {
					try {
						// Helper function to send progress events
						const sendProgress = (step: string, message: string, details?: any) => {
							const event = {
								type: 'progress',
								step,
								message,
								timestamp: Date.now(),
								details,
							}
							controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
						}

						const shouldStop = () => stopRequested

						sendProgress('starting', 'Beginning workspaces UI rollout batch...')

						const { hasMore, failed } = await startFrontendRollout(
							env,
							sendProgress,
							shouldStop,
							sleepMs,
							percentage
						)

						// Send completion event
						const completionEvent = {
							type: 'complete',
							step: 'finished',
							message: stopRequested
								? 'Rollout stopped by user'
								: failed
									? 'Rollout stopped due to a failure'
									: 'Rollout batch completed',
							timestamp: Date.now(),
							hasMore,
							failed,
						}
						controller.enqueue(
							new TextEncoder().encode(`data: ${JSON.stringify(completionEvent)}\n\n`)
						)
					} catch (error) {
						// Send error event
						const errorEvent = {
							type: 'error',
							step: 'error',
							message: error instanceof Error ? error.message : 'Unknown error occurred',
							timestamp: Date.now(),
							details: { error: error instanceof Error ? error.stack : String(error) },
						}
						controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
					} finally {
						controller.close()
					}
				},
				cancel() {
					// Called when client closes the EventSource connection
					stopRequested = true
				},
			}),
			{
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Cache-Control',
				},
			}
		)
	})
	.get('/app/admin/feature-flags', getFeatureFlagsAdmin)
	.post('/app/admin/feature-flags', async (req, env) => {
		const body: any = await req.json()
		const { flag, enabled, percentage } = body

		if (typeof flag !== 'string') {
			throw new StatusError(400, 'flag (string) is required')
		}
		if (enabled !== undefined && typeof enabled !== 'boolean') {
			throw new StatusError(400, 'enabled must be a boolean')
		}
		if (
			percentage !== undefined &&
			(typeof percentage !== 'number' || percentage < 0 || percentage > 100)
		) {
			throw new StatusError(400, 'percentage must be a number between 0 and 100')
		}

		if (!FEATURE_FLAG_KEYS.includes(flag as FeatureFlagKey)) {
			throw new StatusError(400, `Invalid flag. Must be one of: ${FEATURE_FLAG_KEYS.join(', ')}`)
		}

		const update: { enabled?: boolean; percentage?: number } = {}
		if (enabled !== undefined) update.enabled = enabled
		if (percentage !== undefined) update.percentage = percentage

		await setFeatureFlag(env, flag as FeatureFlagKey, update)
		return json({ success: true, flag, ...update })
	})
	.post('/app/admin/create_legacy_file', async (_res, env) => {
		const slug = uniqueId()
		await getRoomDurableObject(env, slug).__admin__createLegacyRoom(slug)
		return json({ slug })
	})
	.post('/app/admin/hard_delete_file/:fileId', async (res, env) => {
		const fileId = res.params.fileId
		assert(typeof fileId === 'string', 'fileId is required')

		const pg = createPostgresConnectionPool(env, '/app/admin/hard_delete_file')
		const file = await pg.selectFrom('file').where('id', '=', fileId).selectAll().executeTakeFirst()
		if (!file) {
			if (await maybeHardDeleteLegacyFile({ id: fileId, env })) {
				return new Response('deleted')
			} else {
				return new Response('File not found', { status: 404 })
			}
		}
		return await hardDeleteAppFile({ pg, file, env })
	})
	.post('/app/admin/delete_user', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)

		await performUserDeletion(userRow, env)

		return new Response('User deleted', { status: 200 })
	})
	.get('/app/admin/delete_user_sse', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}

		const userRow = await requireUser(env, q)

		return new Response(
			new ReadableStream({
				async start(controller) {
					try {
						// Helper function to send progress events
						const sendProgress = (step: string, message: string, details?: any) => {
							const event = {
								type: 'progress',
								step,
								message,
								timestamp: Date.now(),
								details,
							}
							controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
						}

						sendProgress('starting', 'Beginning user deletion process...', { userId: userRow.id })

						await performUserDeletion(userRow, env, sendProgress)

						// Send completion event
						const completionEvent = {
							type: 'complete',
							step: 'finished',
							message: 'User deletion completed successfully',
							timestamp: Date.now(),
							details: { userId: userRow.id },
						}
						controller.enqueue(
							new TextEncoder().encode(`data: ${JSON.stringify(completionEvent)}\n\n`)
						)
					} catch (error) {
						// Send error event
						const errorEvent = {
							type: 'error',
							step: 'error',
							message: error instanceof Error ? error.message : 'Unknown error occurred',
							timestamp: Date.now(),
							details: { error: error instanceof Error ? error.stack : String(error) },
						}
						controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
					} finally {
						controller.close()
					}
				},
			}),
			{
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Cache-Control',
				},
			}
		)
	})
	.get('/app/admin/download-tldr/:fileSlug', async (res, env) => {
		const fileSlug = res.params.fileSlug
		assert(typeof fileSlug === 'string', 'fileSlug is required')
		return await returnFileSnapshot(env, fileSlug, true)
	})
	.get('/app/admin/download-legacy-tldr/:fileSlug', async (res, env) => {
		const fileSlug = res.params.fileSlug
		assert(typeof fileSlug === 'string', 'fileSlug is required')
		return await returnFileSnapshot(env, fileSlug, false)
	})

async function maybeHardDeleteLegacyFile({ id, env }: { id: string; env: Environment }) {
	return await getRoomDurableObject(env, id).__admin__hardDeleteIfLegacy()
}

async function hardDeleteAppFile({
	pg,
	file,
	env,
}: {
	env: Environment
	pg: ReturnType<typeof createPostgresConnectionPool>
	file: TlaFile
}) {
	if (!file.isDeleted) {
		// do soft delete first if not done already
		await pg.updateTable('file').set('isDeleted', true).where('id', '=', file.id).execute()
		// allow a little time for the delete to propagate
		// don't think this is really needed, but just in case
		await sleep(1000)
	}
	// clean up assets eagerly
	const assets = await pg.selectFrom('asset').where('fileId', '=', file.id).selectAll().execute()
	for (const asset of assets) {
		await env.UPLOADS.delete(asset.objectName)
		// TODO: bust caches
		// it's tricky though. calling caches.default.delete() will only delete the cache entry
		// in the local datacenter so we'd need to do a global cache bust with the REST API
		// either that or maintain a KV store of deleted assets and check that before serving
		// could maybe use a bloom filter if that hurts perf too much.
		// although how would the bloom filter sync across workers 🤔
		// since cache entries last a year we could store a timestamp in the KV and clean it periodically
		// or just let it grow forever, it's not that big.

		// const cacheUrl = new URL(`${appOrigin}/app/uploads/${asset.objectName}`)
		// console.log('Busting our cache entry', asset.objectName)
		// await caches.default.delete(cacheUrl)
		// console.log('Busting resize worker cache entry')
		// await env.IMAGE_RESIZE_WORKER.bustCache(cacheUrl.toString())
	}
	// hard delete file (this will trigger a cascade delete of all remaining related records & R2 objects)
	await pg.deleteFrom('file').where('id', '=', file.id).execute()
	return new Response('Deleted', { status: 200 })
}

async function deleteUserFromAnalytics(
	userId: string,
	env: Environment,
	sendProgress?: (step: string, message: string, details?: any) => void
) {
	if (!env.ANALYTICS_API_URL || !env.ANALYTICS_API_TOKEN) {
		sendProgress?.(
			'analytics',
			'Skipping analytics deletion - missing configuration (ANALYTICS_API_URL or ANALYTICS_API_TOKEN)'
		)
		return
	}

	try {
		const response = await fetch(`${env.ANALYTICS_API_URL}/api/user-deletion`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.ANALYTICS_API_TOKEN}`,
			},
			body: JSON.stringify({
				clerk_id: userId,
			}),
			signal: AbortSignal.timeout(30000),
		})

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error')
			throw new Error(`Analytics API returned ${response.status}: ${errorText}`)
		}

		const result = (await response.json()) as { success: boolean }
		sendProgress?.('analytics', 'Successfully deleted user data from analytics', {
			success: result.success,
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error('Failed to delete user from analytics:', errorMessage)
		sendProgress?.('analytics', `Warning: Analytics deletion failed - ${errorMessage}`)
	}
}

async function performUserDeletion(
	userRow: any,
	env: any,
	sendProgress?: (step: string, message: string, details?: any) => void
) {
	const pg = createPostgresConnectionPool(env, '/app/admin/delete_user')

	// Step 1: Find all groups the user is the only owner of
	// This includes their home group (group.id = user.id) and any other groups they solely own
	sendProgress?.('groups', 'Finding groups to delete...')

	// Get all groups where this user is an owner
	const userOwnedGroupMemberships = await pg
		.selectFrom('group_user')
		.where('userId', '=', userRow.id)
		.where('role', '=', 'owner')
		.select('groupId')
		.execute()

	const groupsToDelete: string[] = []

	for (const membership of userOwnedGroupMemberships) {
		// Check if this user is the only owner of this group
		const ownerCount = await pg
			.selectFrom('group_user')
			.where('groupId', '=', membership.groupId)
			.where('role', '=', 'owner')
			.select((eb) => eb.fn.countAll().as('count'))
			.executeTakeFirst()

		if (ownerCount && Number(ownerCount.count) === 1) {
			groupsToDelete.push(membership.groupId)
		}
	}

	sendProgress?.('groups', `Found ${groupsToDelete.length} groups to delete`, {
		groupCount: groupsToDelete.length,
		groupIds: groupsToDelete,
	})

	// Step 2: Soft delete groups (the cleanup_deleted_group_trigger will soft delete their files)
	if (groupsToDelete.length > 0) {
		sendProgress?.('groups', 'Soft deleting groups...')
		await pg.updateTable('group').set('isDeleted', true).where('id', 'in', groupsToDelete).execute()
	}

	// Step 3: Get all files to hard delete
	const filesToDelete = new Map<string, TlaFile>()

	if (groupsToDelete.length > 0) {
		const groupFiles = await pg
			.selectFrom('file')
			.where('owningGroupId', 'in', groupsToDelete)
			.selectAll()
			.execute()
		for (const file of groupFiles) {
			filesToDelete.set(file.id, file)
		}
	}

	sendProgress?.('files', `Found ${filesToDelete.size} files to delete`, {
		fileCount: filesToDelete.size,
	})

	// Allow time for soft deletes to propagate
	if (groupsToDelete.length > 0 || filesToDelete.size > 0) {
		await sleep(3000)
	}

	// Now hard delete all files
	for (const file of filesToDelete.values()) {
		sendProgress?.('files', `Hard deleting file '${file.name}' (${file.id})`)
		await hardDeleteAppFile({ pg, file, env })
	}

	sendProgress?.('database', 'Cleaning up database records...')

	// Step 5: Hard delete groups and user in a transaction
	await pg.transaction().execute(async (tx) => {
		// Clean up tables that don't have CASCADE delete constraints
		await tx.deleteFrom('user_mutation_number').where('userId', '=', userRow.id).execute()

		// Clean up assets that reference this user (nullable foreign key)
		await tx.deleteFrom('asset').where('userId', '=', userRow.id).execute()

		// Remove user from all groups they're a member of (including ones they don't solely own)
		await tx.deleteFrom('group_user').where('userId', '=', userRow.id).execute()

		// Hard delete the groups (this will cascade delete group_user and group_file entries)
		if (groupsToDelete.length > 0) {
			await tx.deleteFrom('group').where('id', 'in', groupsToDelete).execute()
		}

		// Delete the user row (this will cascade delete any remaining related records)
		await tx.deleteFrom('user').where('id', '=', userRow.id).execute()
	})

	sendProgress?.('clerk', 'Deleting user from Clerk...')

	// Delete user from Clerk
	const clerk = getClerkClient(env)
	await clerk.users.deleteUser(userRow.id)

	// Delete user from analytics service
	sendProgress?.('analytics', 'Deleting user from analytics...')
	await deleteUserFromAnalytics(userRow.id, env, sendProgress)

	sendProgress?.('durable_object', 'Cleaning up user durable object state...')

	// Clean up user durable object state and R2 data
	const user = getUserDurableObject(env, userRow.id)
	await user.admin_delete(userRow.id)
}

async function getNextUnenrolledUsers(
	pg: ReturnType<typeof createPostgresConnectionPool>,
	limit: number
) {
	// md5(id) gives a deterministic shuffle — unbiased by signup date (raw ids
	// are KSUID-like and time-sortable) and stable across chunks and reruns
	return await pg
		.selectFrom('user')
		.where((eb) => eb.or([eb('flags', 'not like', '%groups_frontend%'), eb('flags', 'is', null)]))
		.select(['id'])
		.orderBy(sql`md5(id)`, 'asc')
		.limit(limit)
		.execute()
}

async function getNextEnrolledUsers(
	pg: ReturnType<typeof createPostgresConnectionPool>,
	limit: number
) {
	// Reverse hash order: unenrolling drops the most-recently-enrolled cohort,
	// so lowering the percentage leaves the same set as rolling straight to it
	return await pg
		.selectFrom('user')
		.where('flags', 'like', '%groups_frontend%')
		.select(['id'])
		.orderBy(sql`md5(id)`, 'desc')
		.limit(limit)
		.execute()
}

async function getNumUnenrolledUsers(pg: ReturnType<typeof createPostgresConnectionPool>) {
	const res = await sql<{
		count: number
	}>`select count(*) from public.user where flags not like '%groups_frontend%' or flags is null`.execute(
		pg
	)
	return res.rows[0].count
}
async function getTotalUsers(pg: ReturnType<typeof createPostgresConnectionPool>) {
	const res = await sql<{ count: number }>`select count(*) from public.user`.execute(pg)
	return res.rows[0].count
}

async function startFrontendRollout(
	env: Environment,
	sendProgress: (step: string, message: string, details?: any) => void,
	shouldStop: () => boolean,
	sleepTime: number = 100,
	percentage: number = 0
): Promise<{ hasMore: boolean; failed: boolean }> {
	// Plain SQL on the shared pool — clients pick the flag up live through Zero,
	// so no per-user DO work (same as acceptInvite) and no subrequest/connection
	// limits (#7052, #7076).
	const chunkSize = 200
	const batchSize = 2000 // per SSE request; the client chains requests via hasMore
	const pg = createPostgresConnectionPool(env, '/app/admin/migrate_users_batch')

	sendProgress('query', 'Checking current workspaces UI enrollment...')

	const unenrolledUsers = await getNumUnenrolledUsers(pg)
	const totalUsers = await getTotalUsers(pg)
	const toEnroll = computeUsersToEnroll({ totalUsers, unenrolledUsers, percentage })
	const toUnenroll = computeUsersToUnenroll({ totalUsers, unenrolledUsers, percentage })
	// At most one direction is non-zero; lowering the target unenrolls users
	const enrolling = toEnroll > 0
	const usersToMigrate = enrolling ? toEnroll : toUnenroll
	const verb = enrolling ? 'enroll' : 'unenroll'
	let successCount = 0
	let failureCount = 0

	function getStats() {
		return {
			totalUsers,
			usersToMigrate,
			successCount,
			failureCount,
			progress: successCount / usersToMigrate,
		}
	}

	sendProgress(
		'query',
		`${unenrolledUsers}/${totalUsers} users without the workspaces UI, ${verb}ing ${usersToMigrate} to reach ${percentage}%`,
		getStats()
	)

	if (usersToMigrate === 0) {
		sendProgress('complete', `No users to update — already at ${percentage}%`)
		return { hasMore: false, failed: false }
	}

	let remainingThisRequest = Math.min(batchSize, usersToMigrate)

	while (remainingThisRequest > 0) {
		if (shouldStop()) {
			sendProgress('stopped', 'Rollout stopped by user', getStats())
			break
		}

		const limit = Math.min(chunkSize, remainingThisRequest)
		const chunk = enrolling
			? await getNextUnenrolledUsers(pg, limit)
			: await getNextEnrolledUsers(pg, limit)
		if (chunk.length === 0) break

		try {
			const ids = chunk.map((u) => u.id)
			const updated = await retry(() =>
				enrolling ? enrollUsersInWorkspacesUi(pg, ids) : unenrollUsersFromWorkspacesUi(pg, ids)
			)
			successCount += updated
			if (updated === chunk.length) {
				sendProgress(
					'success',
					`${enrolling ? 'Enrolled' : 'Unenrolled'} ${updated} users`,
					getStats()
				)
			} else {
				// Shortfall = rows skipped by the flag guard: a retry whose first
				// attempt committed, or a concurrent change (e.g. invite accept).
				// Data is correct, only the counts drift.
				sendProgress(
					'success',
					`${enrolling ? 'Enrolled' : 'Unenrolled'} ${updated}/${chunk.length} users in this chunk (the rest were already updated)`,
					getStats()
				)
			}
		} catch (error) {
			failureCount += chunk.length
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error(`workspaces UI rollout: failed to ${verb} chunk`, errorMessage)

			// 'failure' events get stored in the client's log
			sendProgress(
				'failure',
				`Failed to ${verb} a chunk of ${chunk.length} users (some may have been updated before the error)`,
				{
					userIds: chunk.map((u) => u.id),
					error: errorMessage,
					...getStats(),
				}
			)
			sendProgress('summary', 'Rollout stopped due to failure', {
				failures: [{ userIds: chunk.map((u) => u.id), error: errorMessage }],
			})
			return { hasMore: false, failed: true }
		}

		remainingThisRequest -= chunk.length

		// Pace the update bursts hitting zero-cache
		await sleep(sleepTime)
	}

	sendProgress('summary', 'Rollout batch complete', getStats())

	// More requests needed if we're still off target in either direction
	const stillUnenrolled = await getNumUnenrolledUsers(pg)
	const stillOffTarget =
		computeUsersToEnroll({ totalUsers, unenrolledUsers: stillUnenrolled, percentage }) +
		computeUsersToUnenroll({ totalUsers, unenrolledUsers: stillUnenrolled, percentage })
	return {
		hasMore: !shouldStop() && stillOffTarget > 0,
		failed: false,
	}
}
