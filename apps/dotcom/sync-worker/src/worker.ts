/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />
import {
	FILE_PREFIX,
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
	createMutators,
	schema,
} from '@tldraw/dotcom-shared'
import {
	createRouter,
	createSentry,
	handleApiRequest,
	handleUserAssetGet,
	notFound,
} from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { cors, json } from 'itty-router'
import {
	PostgresJSConnection,
	PushProcessor,
	ZQLDatabase,
} from '../../../../node_modules/@rocicorp/zero/out/zero/src/pg'
import { adminRoutes } from './adminRoutes'
import { POSTHOG_URL } from './config'
import { healthCheckRoutes } from './healthCheckRoutes'
import { createPostgresConnectionPool, makePostgresConnector } from './postgres'
import { createRoomSnapshot } from './routes/createRoomSnapshot'
import { extractBookmarkMetadata } from './routes/extractBookmarkMetadata'
import { getReadonlySlug } from './routes/getReadonlySlug'
import { getRoomHistory } from './routes/getRoomHistory'
import { getRoomHistorySnapshot } from './routes/getRoomHistorySnapshot'
import { getRoomSnapshot } from './routes/getRoomSnapshot'
import { joinExistingRoom } from './routes/joinExistingRoom'
import { submitFeedback } from './routes/submitFeedback'
import { createFiles } from './routes/tla/createFiles'
import { forwardRoomRequest } from './routes/tla/forwardRoomRequest'
import { getPublishedFile } from './routes/tla/getPublishedFile'
import { upload } from './routes/tla/uploads'
import { testRoutes } from './testRoutes'
import { Environment, QueueMessage, isDebugLogging } from './types'
import { getLogger, getReplicator, getUserDurableObject } from './utils/durableObjects'
import { getAuth, requireAuth } from './utils/tla/getAuth'
export { TLDrawDurableObject } from './TLDrawDurableObject'
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

	.get('/readonly-slug/:roomId', getReadonlySlug)
	.get('/unfurl', extractBookmarkMetadata)
	.post('/unfurl', extractBookmarkMetadata)
	.post(`/${ROOM_PREFIX}/:roomId/restore`, forwardRoomRequest)
	.post(`/app/file/:roomId/restore`, forwardRoomRequest)
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
	.post('/app/zero/push', async (req, env) => {
		const auth = await requireAuth(req, env)
		const processor = new PushProcessor(
			new ZQLDatabase(new PostgresJSConnection(makePostgresConnector(env)), schema),
			'debug'
		)
		const result = await processor.process(createMutators(auth.userId), req)
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
			after: (response) => {
				const setCookies = response.headers.getAll('set-cookie')
				// unfortunately corsify mishandles the set-cookie header, so
				// we need to manually add it back in
				const result = corsify(response)
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

export function isAllowedOrigin(origin: string) {
	if (!origin) return undefined
	if (origin === 'http://localhost:3000') return origin
	if (origin === 'http://localhost:5420') return origin
	if (origin === 'https://meet.google.com') return origin
	if (origin.endsWith('.tldraw.com')) return origin
	if (origin.endsWith('.tldraw.dev')) return origin
	if (origin.endsWith('.tldraw.club')) return origin
	if (origin.endsWith('-tldraw.vercel.app')) return origin
	return undefined
}

async function blockUnknownOrigins(request: Request, env: Environment) {
	// allow requests for the same origin (new rewrite routing for SPA)
	if (request.headers.get('sec-fetch-site') === 'same-origin') {
		return undefined
	}

	if (new URL(request.url).pathname === '/auth/callback') {
		// allow auth callback because we use the special cookie to verify
		// the request
		return undefined
	}

	const origin = request.headers.get('origin')

	// if there's no origin, this cannot be a cross-origin request, so we allow it.
	if (!origin) return undefined

	if (env.IS_LOCAL !== 'true' && !isAllowedOrigin(origin)) {
		console.error('Attempting to connect from an invalid origin:', origin, env, request)
		return new Response('Not allowed', { status: 403 })
	}

	// origin doesn't match, so we can continue
	return undefined
}
