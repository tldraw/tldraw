import { APP_ASSET_UPLOAD_ENDPOINT } from '@tldraw/dotcom-shared'
import { T } from '@tldraw/validate'
import { createRouter, handleApiRequest, notFound, parseRequestQuery } from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'

declare const fetch: typeof import('@cloudflare/workers-types').fetch

interface Environment {
	IS_LOCAL?: string
	SENTRY_DSN?: undefined
	MULTIPLAYER_SERVER?: string

	SYNC_WORKER: Fetcher
}

const queryValidator = T.object({
	w: T.string.optional(),
	q: T.string.optional(),
})

function useServiceBinding(env: Environment, origin: string) {
	if (env.IS_LOCAL) return origin === 'localhost:3000'
	const multiplayerServer = env.MULTIPLAYER_SERVER
	if (!multiplayerServer) throw new Error('Missing MULTIPLAYER_SERVER env variable')
	return multiplayerServer.includes(origin)
}

export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = createRouter()
		.get('/:origin/:path+', async (request) => {
			const { origin, path } = request.params
			const query = parseRequestQuery(request, queryValidator)

			if (!this.isValidOrigin(origin)) return notFound()

			const accept = request.headers.get('Accept') ?? ''
			const format = accept.includes('image/avif')
				? ('avif' as const)
				: accept.includes('image/webp')
					? ('webp' as const)
					: null

			const protocol = this.env.IS_LOCAL ? 'http' : 'https'
			const passthroughUrl = new URL(`${protocol}://${origin}/${path}`)
			const cacheKey = new URL(passthroughUrl)
			cacheKey.searchParams.set('format', format ?? 'original')
			for (const [key, value] of Object.entries(query)) {
				cacheKey.searchParams.set(key, value)
			}

			const cachedResponse = await caches.default.match(cacheKey)
			if (cachedResponse) {
				// for some reason, cloudflare's cache doesn't seem to handle the etag properly:
				if (cachedResponse.status === 200) {
					const ifNoneMatch = request.headers.get('If-None-Match')
					const etag = cachedResponse.headers.get('etag')
					if (ifNoneMatch && etag) {
						const parsedEtag = parseEtag(etag)
						for (const tag of ifNoneMatch.split(', ')) {
							if (parseEtag(tag) === parsedEtag) {
								return new Response(null, { status: 304 })
							}
						}
					}
				}

				return cachedResponse
			}

			const imageOptions: RequestInitCfPropertiesImage = {
				fit: 'scale-down',
			}
			if (format) imageOptions.format = format
			if (query.w) imageOptions.width = Number(query.w)
			if (query.q) imageOptions.quality = Number(query.q)

			let actualResponse: Response
			if (useServiceBinding(this.env, origin)) {
				const route = `/${path}`
				if (!route.startsWith(APP_ASSET_UPLOAD_ENDPOINT)) {
					return notFound()
				}
				const req = new Request(passthroughUrl.href, { cf: { image: imageOptions } })
				actualResponse = await this.env.SYNC_WORKER.fetch(req)
			} else {
				actualResponse = await fetch(passthroughUrl, { cf: { image: imageOptions } })
			}
			if (!actualResponse.headers.get('content-type')?.startsWith('image/')) return notFound()
			if (actualResponse.status === 200) {
				this.ctx.waitUntil(caches.default.put(cacheKey, actualResponse.clone()))
			}

			return actualResponse
		})
		.all('*', notFound)

	override fetch(request: Request): Promise<Response> {
		return handleApiRequest({
			request,
			router: this.router,
			env: this.env,
			ctx: this.ctx,
			after: (response) => response,
		})
	}

	isValidOrigin(origin: string) {
		if (this.env.IS_LOCAL) {
			return true
		}

		return (
			origin.endsWith('.tldraw.com') ||
			origin.endsWith('.tldraw.xyz') ||
			origin.endsWith('.tldraw.dev') ||
			origin.endsWith('.tldraw.workers.dev')
		)
	}
}

function parseEtag(etag: string) {
	const match = etag.match(/^(?:W\/)"(.*)"$/)
	return match ? match[1] : null
}
