/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { createCors } from 'itty-cors'
import { Router } from 'itty-router'

const { preflight, corsify } = createCors({ origins: ['*'] })

interface Env {
	UPLOADS: R2Bucket
}

function parseRange(
	encoded: string | null
): undefined | { offset: number; end: number; length: number } {
	if (encoded === null) {
		return
	}

	const parts = (encoded.split('bytes=')[1]?.split('-') ?? []).filter(Boolean)
	if (parts.length !== 2) {
		console.error('Not supported to skip specifying the beginning/ending byte at this time')
		return
	}

	return {
		offset: Number(parts[0]),
		end: Number(parts[1]),
		length: Number(parts[1]) + 1 - Number(parts[0]),
	}
}

function objectNotFound(objectName: string): Response {
	return new Response(`<html><body>R2 object "<b>${objectName}</b>" not found</body></html>`, {
		status: 404,
		headers: {
			'content-type': 'text/html; charset=UTF-8',
		},
	})
}

const router = Router()

router
	.all('*', preflight)
	.get('/uploads/list', async (request, env: Env) => {
		// we need to protect this behind auth
		const url = new URL(request.url)
		const options: R2ListOptions = {
			prefix: url.searchParams.get('prefix') ?? undefined,
			delimiter: url.searchParams.get('delimiter') ?? undefined,
			cursor: url.searchParams.get('cursor') ?? undefined,
		}

		const listing = await env.UPLOADS.list(options)
		return Response.json(listing)
	})
	.get('/uploads/:objectName', async (request: Request, env: Env, ctx: ExecutionContext) => {
		const url = new URL(request.url)

		const range = parseRange(request.headers.get('range'))

		// NOTE: caching will only work when this is deployed to
		// a custom domain, not a workers.dev domain. It's a no-op
		// otherwise.

		// Construct the cache key from the cache URL
		const cacheKey = new Request(url.toString(), request)
		const cache = caches.default as Cache

		// Check whether the value is already available in the cache
		// if not, you will need to fetch it from R2, and store it in the cache
		// for future access
		let cachedResponse
		if (!range) {
			cachedResponse = await cache.match(cacheKey)

			if (cachedResponse) {
				return cachedResponse
			}
		}

		const ifNoneMatch = request.headers.get('if-none-match')
		let hs = request.headers
		if (ifNoneMatch?.startsWith('W/')) {
			hs = new Headers(request.headers)
			hs.set('if-none-match', ifNoneMatch.slice(2))
		}

		// TODO: infer types from path
		// @ts-expect-error
		const object = await env.UPLOADS.get(request.params.objectName, {
			range,
			onlyIf: hs,
		})

		if (object === null) {
			// TODO: infer types from path
			// @ts-expect-error
			return objectNotFound(request.params.objectName)
		}

		const headers = new Headers()
		object.writeHttpMetadata(headers)
		headers.set('etag', object.httpEtag)
		if (range) {
			headers.set('content-range', `bytes ${range.offset}-${range.end}/${object.size}`)
		}

		// Cache API respects Cache-Control headers. Setting s-max-age to 7 days
		// Any changes made to the response here will be reflected in the cached value
		headers.append('Cache-Control', 's-maxage=604800')

		const hasBody = 'body' in object && object.body
		const status = hasBody ? (range ? 206 : 200) : 304
		const response = new Response(hasBody ? object.body : undefined, {
			headers,
			status,
		})

		// Store the response in the cache for future access
		if (!range) {
			ctx.waitUntil(cache.put(cacheKey, response.clone()))
		}

		return response
	})
	.head('/uploads/:objectName', async (request: Request, env: Env) => {
		// TODO: infer types from path
		// @ts-expect-error
		const object = await env.UPLOADS.head(request.params.objectName)

		if (object === null) {
			// TODO: infer types from path
			// @ts-expect-error
			return objectNotFound(request.params.objectName)
		}

		const headers = new Headers()
		object.writeHttpMetadata(headers)
		headers.set('etag', object.httpEtag)
		return new Response(null, {
			headers,
		})
	})
	.post('/uploads/:objectName', async (request: Request, env: Env) => {
		// TODO: infer types from path
		// @ts-expect-error
		const object = await env.UPLOADS.put(request.params.objectName, request.body, {
			httpMetadata: request.headers,
		})
		return new Response(null, {
			headers: {
				etag: object.httpEtag,
			},
		})
	})
	.delete('/uploads/:objectName', async (request: Request, env: Env) => {
		// Not sure if this is necessary, might be dangerous to expose
		// TODO: infer types from path
		// @ts-expect-error
		await env.UPLOADS.delete(request.params.objectName)
		return new Response()
	})
	.get('*', () => new Response('Not found', { status: 404 }))

const Worker = {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return router
			.handle(request, env, ctx)
			.catch((err) => {
				// eslint-disable-next-line no-console
				console.log(err, err.stack)
				return new Response((err as Error).message, { status: 500 })
			})
			.then(corsify)
	},
}

export default Worker
