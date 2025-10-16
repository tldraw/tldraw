/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />
import { createRouter, handleApiRequest, notFound } from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { cors, IRequest } from 'itty-router'
import { getAuth, requireAdminAccess, SignedInAuth } from './auth'
import { Environment } from './environment'
import { stream } from './routes/stream'

// Extend IRequest to include auth
export interface AuthenticatedRequest extends IRequest {
	auth: SignedInAuth
}

const { preflight, corsify } = cors({
	origin: isAllowedOrigin,
})

export default class extends WorkerEntrypoint<Environment> {
	readonly router = createRouter<Environment>()
		.all('*', preflight)
		.all('*', blockUnknownOrigins)
		.all('*', requireTldrawEmail)
		.post('/stream', stream)
		.all('*', notFound)

	override async fetch(request: Request): Promise<Response> {
		return handleApiRequest({
			router: this.router,
			request,
			env: this.env,
			ctx: this.ctx,
			after: corsify,
		})
	}
}

export function isAllowedOrigin(origin: string) {
	if (!origin) return undefined
	if (origin === 'http://localhost:3000') return origin
	if (origin === 'http://localhost:5420') return origin
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

async function requireTldrawEmail(request: IRequest, env: Environment) {
	// Skip authentication check for OPTIONS requests (CORS preflight)
	if (request.method === 'OPTIONS') {
		return undefined
	}

	try {
		const auth = await getAuth(request, env)
		if (!auth || 'userId' in auth === false || auth.userId === null) {
			throw new Error('Unauthorized')
		}
		await requireAdminAccess(env, auth)
		// Attach auth to request for downstream use
		;(request as AuthenticatedRequest).auth = auth
		return undefined
	} catch (error: any) {
		console.error('Authentication failed:', error.message)
		return new Response(error.message || 'Unauthorized', {
			status: error.status || 403,
		})
	}
}

// Make the durable object available to the cloudflare worker
export { AgentDurableObject } from './do/AgentDurableObject'
