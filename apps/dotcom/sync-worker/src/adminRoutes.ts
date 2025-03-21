import { TlaFile } from '@tldraw/dotcom-shared'
import { assert, sleep, uniqueId } from '@tldraw/utils'
import { createRouter } from '@tldraw/worker-shared'
import { StatusError, json } from 'itty-router'
import { createPostgresConnectionPool } from './postgres'
import { type Environment } from './types'
import { getReplicator, getRoomDurableObject, getUserDurableObject } from './utils/durableObjects'
import { getClerkClient, requireAuth } from './utils/tla/getAuth'

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
		const user = await getClerkClient(env).users.getUser(auth.userId)
		if (
			!user.primaryEmailAddress?.emailAddress.endsWith('@tldraw.com') ||
			user.primaryEmailAddress?.verification?.status !== 'verified'
		) {
			throw new StatusError(403, 'Unauthorized')
		}
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
