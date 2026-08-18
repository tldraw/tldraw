import { error, IRequest, json } from 'itty-router'

export async function handleImageUpload(request: IRequest, env: Env) {
	const { imageId } = request.params
	const contentType = request.headers.get('content-type') ?? 'image/png'

	if (!contentType.startsWith('image/')) return error(400, 'Invalid content type')

	// Don't overwrite existing images.
	if (!(await env.IMAGE_BUCKET.head(imageId))) {
		await env.IMAGE_BUCKET.put(imageId, request.body, { httpMetadata: { contentType } })
	}

	return json({ ok: true })
}

export async function handleImageDownload(request: IRequest, env: Env, ctx: ExecutionContext) {
	const { imageId } = request.params

	// Use caches.open() to avoid DOM/Workers CacheStorage type conflict.
	const cache = await caches.open('images')
	const cacheKey = new Request(request.url, { headers: request.headers })
	const cachedResponse = await cache.match(cacheKey)
	if (cachedResponse) return cachedResponse

	const object = await env.IMAGE_BUCKET.get(imageId)
	if (!object) return new Response('Not found', { status: 404 })

	const response = new Response(object.body, {
		headers: {
			'content-type': object.httpMetadata?.contentType ?? 'image/png',
			// Generated images are immutable — cache them aggressively.
			'cache-control': 'public, max-age=31536000, immutable',
		},
	})
	ctx.waitUntil(cache.put(cacheKey, response.clone()))
	return response
}
