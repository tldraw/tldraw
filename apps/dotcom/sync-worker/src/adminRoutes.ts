import { TlaFile } from '@tldraw/dotcom-shared'
import { assert, sleep, uniqueId } from '@tldraw/utils'
import { createRouter } from '@tldraw/worker-shared'
import { StatusError, json } from 'itty-router'
import { createPostgresConnectionPool } from './postgres'
import { returnFileSnapshot } from './routes/tla/getFileSnapshot'
import { type Environment } from './types'
import { getReplicator, getRoomDurableObject, getUserDurableObject } from './utils/durableObjects'
import { getClerkClient, requireAdminAccess, requireAuth } from './utils/tla/getAuth'

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

	// First, get all files owned by this user
	const userFiles = await pg
		.selectFrom('file')
		.where('ownerId', '=', userRow.id)
		.selectAll()
		.execute()

	sendProgress?.('files', `Found ${userFiles.length} files to delete`, {
		fileCount: userFiles.length,
	})

	// Hard delete all user's files
	for (let i = 0; i < userFiles.length; i++) {
		const file = userFiles[i]
		sendProgress?.('files', `Deleting file ${i + 1}/${userFiles.length}: ${file.name}`, {
			fileId: file.id,
		})
		await hardDeleteAppFile({ pg, file, env })
	}

	sendProgress?.('database', 'Cleaning up database records...')

	// Clean up tables that don't have CASCADE delete constraints and delete user in a transaction
	await pg.transaction().execute(async (tx) => {
		// Clean up tables that don't have CASCADE delete constraints
		await tx.deleteFrom('user_mutation_number').where('userId', '=', userRow.id).execute()

		// Clean up assets that reference this user (nullable foreign key)
		await tx.deleteFrom('asset').where('userId', '=', userRow.id).execute()

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
