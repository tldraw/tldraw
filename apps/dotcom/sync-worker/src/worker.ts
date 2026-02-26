/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />
import { mustGetQuery } from '@rocicorp/zero'
import { PushProcessor, handleQueryRequest } from '@rocicorp/zero/server'
import { zeroPostgresJS } from '@rocicorp/zero/server/adapters/postgresjs'
import {
	FILE_PREFIX,
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
	createMutators,
	queries,
	schema,
} from '@tldraw/dotcom-shared'
import {
	blockUnknownOrigins,
	createRouter,
	createSentry,
	handleApiRequest,
	handleUserAssetGet,
	isAllowedOrigin,
	notFound,
} from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { IRequest, cors, json } from 'itty-router'
import { adminRoutes } from './adminRoutes'
import { POSTHOG_URL } from './config'
import { healthCheckRoutes } from './healthCheckRoutes'
import { createPostgresConnectionPool } from './postgres'
import { createRoomSnapshot } from './routes/createRoomSnapshot'
import { extractBookmarkMetadata } from './routes/extractBookmarkMetadata'
import { getPierreHistory } from './routes/getPierreHistory'
import { getPierreHistorySnapshot } from './routes/getPierreHistorySnapshot'
import { getReadonlySlug } from './routes/getReadonlySlug'
import { getRoomHistory } from './routes/getRoomHistory'
import { getRoomHistorySnapshot } from './routes/getRoomHistorySnapshot'
import { getRoomSnapshot } from './routes/getRoomSnapshot'
import { joinExistingRoom } from './routes/joinExistingRoom'
import { submitFeedback } from './routes/submitFeedback'
import { acceptInvite } from './routes/tla/acceptInvite'
import { createFiles } from './routes/tla/createFiles'
import { forwardRoomRequest } from './routes/tla/forwardRoomRequest'
import { getInviteInfo } from './routes/tla/getInviteInfo'
import { getPublishedFile } from './routes/tla/getPublishedFile'
import { upload } from './routes/tla/uploads'
import { testRoutes } from './testRoutes'
import { Environment, QueueMessage, isDebugLogging } from './types'
import { getLogger, getReplicator, getUserDurableObject } from './utils/durableObjects'
import { getFeatureFlags } from './utils/featureFlags'
import { getAuth, requireAuth } from './utils/tla/getAuth'
export { TLFileDurableObject } from './TLDrawDurableObject'
export { TLLoggerDurableObject } from './TLLoggerDurableObject'
export { TLPostgresReplicator } from './TLPostgresReplicator'
export { TLStatsDurableObject } from './TLStatsDurableObject'
export { TLUserDurableObject } from './TLUserDurableObject'

const { preflight, corsify } = cors({
	origin: isAllowedOrigin,
})

const QUEUE_BASE_DELAY = 2

const router = createRouter<Environment>()
	.all('*', preflight)
	.all('*', blockUnknownOrigins)
	.post('/snapshots', createRoomSnapshot)
	.get('/snapshot/:roomId', getRoomSnapshot)
	.get(`/${ROOM_PREFIX}/:roomId`, (req, env) =>
		joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_WRITE)
	)
	.get(`/${READ_ONLY_LEGACY_PREFIX}/:roomId`, (req, env) =>
		joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_ONLY_LEGACY)
	)
	.get(`/${READ_ONLY_PREFIX}/:roomId`, (req, env) =>
		joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_ONLY)
	)
	.get(`/${ROOM_PREFIX}/:roomId/history`, (req, env) => getRoomHistory(req, env, false))
	.get(`/${ROOM_PREFIX}/:roomId/history/:timestamp`, (req, env) =>
		getRoomHistorySnapshot(req, env, false)
	)

	.get(`/${FILE_PREFIX}/:roomId/history`, (req, env) => getRoomHistory(req, env, true))
	.get(`/${FILE_PREFIX}/:roomId/history/:timestamp`, (req, env) =>
		getRoomHistorySnapshot(req, env, true)
	)

	.get(`/${FILE_PREFIX}/:roomId/pierre-history`, (req, env) => getPierreHistory(req, env, true))
	.get(`/${FILE_PREFIX}/:roomId/pierre-history/:timestamp`, (req, env) =>
		getPierreHistorySnapshot(req, env, true)
	)

	.get('/readonly-slug/:roomId', getReadonlySlug)
	.get('/unfurl', extractBookmarkMetadata)
	.post('/unfurl', extractBookmarkMetadata)
	.post(`/${ROOM_PREFIX}/:roomId/restore`, forwardRoomRequest)
	.post(`/app/file/:roomId/restore`, forwardRoomRequest)
	.post(`/app/file/:roomId/pierre-restore`, forwardRoomRequest)
	.get('/app/:userId/connect', async (req, env) => {
		// forward req to the user durable object
		const auth = await getAuth(req, env)
		if (!auth) {
			// eslint-disable-next-line no-console
			console.log('auth not found')
			return notFound()
		}

		if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
			return notFound()
		}

		if (req.params.userId !== auth.userId) return notFound()
		const stub = getUserDurableObject(env, auth.userId)
		return stub.fetch(req)
	})
	.post('/app/:userId/init', async (req, env) => {
		// Ensure user exists in DB before Zero can query
		const auth = await requireAuth(req, env)
		if (req.params.userId !== auth.userId) return notFound()
		const stub = getUserDurableObject(env, auth.userId)
		return stub.fetch(req)
	})
	.post('/app/tldr', createFiles)
	.get('/app/replicator-status', async (_, env) => {
		await getReplicator(env).ping()
		return new Response('ok')
	})
	.get('/app/file/:roomId', (req, env) => {
		if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
			return forwardRoomRequest(req, env)
		}
		return notFound()
	})
	.get('/app/publish/:roomId', getPublishedFile)
	.get('/app/uploads/:objectName', async (request, env, ctx) => {
		return handleUserAssetGet({
			request,
			bucket: env.UPLOADS,
			objectName: request.params.objectName,
			context: ctx,
		})
	})
	.post('/app/uploads/:objectName', upload)
	.get('/app/invite/:token', getInviteInfo)
	.post('/app/invite/:token/accept', acceptInvite)
	.all('/app/__test__/*', testRoutes.fetch)
	.get('/app/__debug-tail', (req, env) => {
		if (isDebugLogging(env)) {
			// upgrade to websocket
			if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
				return getLogger(env).fetch(req)
			}
		}

		return new Response('Not Found', { status: 404 })
	})
	.post('/app/__debug-tail/clear', async (req, env) => {
		if (isDebugLogging(env)) {
			// upgrade to websocket
			await getLogger(env).clear()
			return new Response('ok')
		}

		return new Response('Not Found', { status: 404 })
	})
	.post('/app/submit-feedback', submitFeedback)
	.get('/app/feature-flags', getFeatureFlags)
	// end app
	.all('/ph/*', (req) => {
		const url = new URL(req.url)
		const proxied = new Request(
			`${POSTHOG_URL}${url.pathname.replace(/^\/ph\//, '/')}${url.search}`,
			req
		)
		proxied.headers.delete('cookie')
		return fetch(proxied)
	})
	.all('/health-check/*', healthCheckRoutes.fetch)
	.all('/app/admin/*', adminRoutes.fetch)
	.post('/app/zero/mutate', async (req, env) => {
		const auth = await getAuth(req, env)
		if (!auth) {
			return Response.json({ error: 'Unauthorized' }, { status: 401 })
		}
		const processor = new PushProcessor(
			zeroPostgresJS(schema, env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING),
			'debug'
		)
		const result = await processor.process(createMutators(auth.userId), req)
		return json(result)
	})
	.post('/app/zero/query', async (req, env) => {
		const auth = await getAuth(req, env)
		if (!auth) {
			return Response.json({ error: 'Unauthorized' }, { status: 401 })
		}
		const result = await handleQueryRequest(
			(name, args) => {
				const query = mustGetQuery(queries, name)
				return query.fn({ args, ctx: { userId: auth.userId } })
			},
			schema,
			req
		)
		return json(result)
	})
	.all('*', notFound)

export default class Worker extends WorkerEntrypoint<Environment> {
	override async fetch(request: Request): Promise<Response> {
		// if we get a request that starts with /api/, strip it before handling.
		const url = new URL(request.url)
		const pathname = url.pathname.replace(/^\/api\//, '/')
		if (pathname !== url.pathname) {
			url.pathname = pathname
			request = new Request(url.toString(), request)
		}

		return await handleApiRequest({
			router,
			request,
			env: this.env,
			ctx: this.ctx,
			after: (response, request) => {
				// getAll is a Cloudflare-specific method
				const setCookies = (
					response.headers as unknown as import('@cloudflare/workers-types').Headers
				).getAll('set-cookie')
				// Create a new Response with mutable headers before passing to corsify
				// to avoid "Can't modify immutable headers" error
				const mutableResponse = new Response(response.body, response)
				// unfortunately corsify mishandles the set-cookie header, so
				// we need to manually add it back in
				const result = corsify(mutableResponse, request)
				if ([...setCookies].length === 0) {
					return result
				}
				const newResponse = new Response(result.body, result)
				newResponse.headers.delete('set-cookie')
				// add cookies from original response
				for (const cookie of setCookies) {
					newResponse.headers.append('set-cookie', cookie)
				}
				return newResponse
			},
		}).catch((err) => {
			const sentry = createSentry(this.ctx, this.env, request)
			if (sentry) {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				sentry.captureException(err)
			} else {
				console.error(err)
			}
			throw err
		})
	}

	// RPC methods — only callable by workers with a service binding, not from the public internet.

	// Validates auth + file write access before the upload is written to R2.
	async validateUpload(
		fileId: string,
		authorizationHeader: string | null
	): Promise<{ ok: true; userId: string | null } | { ok: false; error: string }> {
		const db = createPostgresConnectionPool(this.env, 'sync-worker')
		try {
			const file = await db
				.selectFrom('file')
				.where('id', '=', fileId)
				.select(['ownerId', 'owningGroupId', 'shared', 'sharedLinkType'])
				.executeTakeFirst()
			if (!file) return { ok: false, error: 'File not found' }

			let userId: string | null = null
			if (authorizationHeader) {
				const fakeReq = new Request('https://internal', {
					headers: { Authorization: authorizationHeader },
				}) as unknown as IRequest
				const auth = await getAuth(fakeReq, this.env)
				userId = auth?.userId ?? null
			}

			const isSharedEdit = file.shared && file.sharedLinkType === 'edit'
			if (userId && file.ownerId === userId) {
				// owner
			} else if (isSharedEdit) {
				// shared for editing
			} else if (userId && file.owningGroupId) {
				const member = await db
					.selectFrom('group_user')
					.select('role')
					.where('groupId', '=', file.owningGroupId)
					.where('userId', '=', userId)
					.executeTakeFirst()
				if (!member) return { ok: false, error: 'Forbidden' }
			} else {
				return { ok: false, error: 'Forbidden' }
			}

			return { ok: true, userId }
		} finally {
			await db.destroy()
		}
	}

	// Queues the DB association after a successful R2 upload.
	async confirmUpload(objectName: string, fileId: string, userId: string | null): Promise<void> {
		await this.env.QUEUE.send({ type: 'asset-upload', objectName, fileId, userId })
	}

	override async queue(batch: MessageBatch<QueueMessage>): Promise<void> {
		const db = createPostgresConnectionPool(this.env, 'sync-worker-queue')
		for (const message of batch.messages) {
			const { objectName, fileId, userId } = message.body
			try {
				await db
					.insertInto('asset')
					.values({ objectName, fileId, userId })
					.executeTakeFirstOrThrow()
				message.ack()
			} catch (_e) {
				message.retry({
					delaySeconds: QUEUE_BASE_DELAY ** message.attempts,
				})
			}
		}
	}
}
