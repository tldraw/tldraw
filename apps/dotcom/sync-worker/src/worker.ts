/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
} from '@tldraw/dotcom-shared'
import { createRouter, handleApiRequest, handleUserAssetGet, notFound } from '@tldraw/worker-shared'
import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers'
import { cors } from 'itty-router'
// import { APP_ID } from './TLAppDurableObject'
import { POSTHOG_URL } from './config'
import { createRoom } from './routes/createRoom'
import { createRoomSnapshot } from './routes/createRoomSnapshot'
import { extractBookmarkMetadata } from './routes/extractBookmarkMetadata'
import { getReadonlySlug } from './routes/getReadonlySlug'
import { getRoomHistory } from './routes/getRoomHistory'
import { getRoomHistorySnapshot } from './routes/getRoomHistorySnapshot'
import { getRoomSnapshot } from './routes/getRoomSnapshot'
import { joinExistingRoom } from './routes/joinExistingRoom'
import { createFiles } from './routes/tla/createFiles'
import { deleteFile } from './routes/tla/deleteFile'
import { forwardRoomRequest } from './routes/tla/forwardRoomRequest'
import { getPublishedFile } from './routes/tla/getPublishedFile'
import { upload } from './routes/tla/uploads'
import { testRoutes } from './testRoutes'
import { Environment, isDebugLogging } from './types'
import { getLogger, getUserDurableObject } from './utils/durableObjects'
import { getAuth } from './utils/tla/getAuth'
// export { TLAppDurableObject } from './TLAppDurableObject'
export { TLDrawDurableObject } from './TLDrawDurableObject'
export { TLLoggerDurableObject } from './TLLoggerDurableObject'
export { TLPostgresReplicator } from './TLPostgresReplicator'
export { TLUserDurableObject } from './TLUserDurableObject'

export class TLAppDurableObject extends DurableObject {}

const { preflight, corsify } = cors({
	origin: isAllowedOrigin,
})

const router = createRouter<Environment>()
	.all('*', preflight)
	.all('*', blockUnknownOrigins)
	.post('/new-room', createRoom)
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
	.get(`/${ROOM_PREFIX}/:roomId/history`, getRoomHistory)
	.get(`/${ROOM_PREFIX}/:roomId/history/:timestamp`, getRoomHistorySnapshot)
	.get('/readonly-slug/:roomId', getReadonlySlug)
	.get('/unfurl', extractBookmarkMetadata)
	.post('/unfurl', extractBookmarkMetadata)
	.post(`/${ROOM_PREFIX}/:roomId/restore`, forwardRoomRequest)
	.get('/app/:userId/connect', async (req, env) => {
		// forward req to the user durable object
		const auth = await getAuth(req, env)
		if (!auth) {
			// eslint-disable-next-line no-console
			console.log('auth not found')
			return notFound()
		}
		const stub = getUserDurableObject(env, auth.userId)
		return stub.fetch(req)
	})
	.post('/app/tldr', createFiles)
	.get('/app/file/:roomId', forwardRoomRequest)
	.get('/app/publish/:roomId', getPublishedFile)
	.get('/app/uploads/:objectName', async (request, env, ctx) => {
		console.log('💡[192]: worker.ts:124: request.params.objectName=', request.params.objectName)
		return handleUserAssetGet({
			request,
			bucket: env.UPLOADS,
			objectName: request.params.objectName,
			context: ctx,
		})
	})
	.post('/app/uploads/:objectName', upload)
	.delete('/app/file/:roomId', deleteFile)
	.all('/app/__test__/*', testRoutes.fetch)
	.all('/ph/*', (req) => {
		const url = new URL(req.url)
		const proxied = new Request(
			`${POSTHOG_URL}${url.pathname.replace(/^\/ph\//, '/')}${url.search}`,
			req
		)
		proxied.headers.delete('cookie')
		return fetch(proxied)
	})
	.get('/app/__debug-tail', (req, env) => {
		if (isDebugLogging(env)) {
			// upgrade to websocket
			if (req.headers.get('upgrade') === 'websocket') {
				return getLogger(env).fetch(req)
			}
		}

		return new Response('Not Found', { status: 404 })
	})
	// end app
	.all('*', notFound)

export default class Worker extends WorkerEntrypoint<Environment> {
	override async fetch(request: Request): Promise<Response> {
		// if we get a request that starts with /api/, strip it before handling.
		const url = new URL(request.url)
		console.log('💡[196]: worker.ts:93: url=', url)
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
		})
	}
}

export function isAllowedOrigin(origin: string) {
	console.log('💡[192]: worker.ts:124: origin=', origin)
	if (!origin) return undefined
	if (origin === 'http://localhost:3000') return origin
	if (origin === 'http://localhost:5420') return origin
	if (origin === 'https://meet.google.com') return origin
	if (origin.endsWith('.tldraw.com')) return origin
	if (origin.endsWith('.tldraw.xyz')) return origin
	if (origin.endsWith('.tldraw.workers.dev')) return origin
	if (origin.endsWith('-tldraw.vercel.app')) return origin
	return undefined
}

async function blockUnknownOrigins(request: Request, env: Environment) {
	// allow requests for the same origin (new rewrite routing for SPA)
	if (request.headers.get('sec-fetch-site') === 'same-origin') {
		console.log("💡[192]: worker.ts:124: request.headers.get('sec-fetch-site') === 'same-origin'")
		return undefined
	}

	if (new URL(request.url).pathname === '/auth/callback') {
		// allow auth callback because we use the special cookie to verify
		// the request
		console.log("💡[192]: worker.ts:124: new URL(request.url).pathname === '/auth/callback'")
		return undefined
	}

	const origin = request.headers.get('origin')
	console.info('💡[193]: worker.ts:150: origin=', origin)

	// if there's no origin, this cannot be a cross-origin request, so we allow it.
	if (!origin) return undefined

	if (env.IS_LOCAL !== 'true' && !isAllowedOrigin(origin)) {
		console.error('Attempting to connect from an invalid origin:', origin, env, request)
		return new Response('Not allowed', { status: 403 })
	}

	console.log('💡[192]: worker.ts:124: origin=', origin)
	// origin doesn't match, so we can continue
	return undefined
}
