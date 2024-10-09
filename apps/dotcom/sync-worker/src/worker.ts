/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
} from '@tldraw/dotcom-shared'
import { createRouter, handleApiRequest, notFound } from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { cors } from 'itty-router'
import { createRoom } from './routes/createRoom'
import { createRoomSnapshot } from './routes/createRoomSnapshot'
import { extractBookmarkMetadata } from './routes/extractBookmarkMetadata'
import { forwardRoomRequest } from './routes/forwardRoomRequest'
import { getReadonlySlug } from './routes/getReadonlySlug'
import { getRoomHistory } from './routes/getRoomHistory'
import { getRoomHistorySnapshot } from './routes/getRoomHistorySnapshot'
import { getRoomSnapshot } from './routes/getRoomSnapshot'
import { joinExistingRoom } from './routes/joinExistingRoom'
import { Environment } from './types'
import { getAuth } from './utils/getAuth'
export { TLAppDurableObject } from './TLAppDurableObject'
export { TLDrawDurableObject } from './TLDrawDurableObject'

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
	.get('/app/file/:roomId', forwardRoomRequest)
	.get('/app', async (req, env) => {
		const auth = await getAuth(req, env)
		if (!auth?.userId) return notFound()

		// This needs to be a websocket request!
		if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
			// Set up the durable object for this room
			const id = env.TLAPP_DO.idFromName(auth.userId)
			const url = new URL(req.url)
			url.pathname = `/app/${auth.userId}`
			// clone the request and add the new url
			return env.TLAPP_DO.get(id).fetch(new Request(url, req))
		}

		return notFound()
	})
	.get(`/${ROOM_PREFIX}/:roomId/history`, getRoomHistory)
	.get(`/${ROOM_PREFIX}/:roomId/history/:timestamp`, getRoomHistorySnapshot)
	.get('/readonly-slug/:roomId', getReadonlySlug)
	.get('/unfurl', extractBookmarkMetadata)
	.post('/unfurl', extractBookmarkMetadata)
	.post(`/${ROOM_PREFIX}/:roomId/restore`, forwardRoomRequest)
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
		})
	}
}

export function isAllowedOrigin(origin: string) {
	if (!origin) return undefined
	if (origin === 'http://localhost:3000') return origin
	if (origin === 'http://localhost:5420') return origin
	if (origin === 'https://meet.google.com') return origin
	if (origin.endsWith('.tldraw.com')) return origin
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
