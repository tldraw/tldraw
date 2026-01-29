import { IRequest } from 'itty-router'
import { notFound } from './errors'

// Minimal interface for R2Bucket operations used in this file
// This avoids type conflicts between ambient and imported Cloudflare types
// Using 'any' for return types to allow compatibility with different R2Bucket type definitions
interface R2BucketLike {
	head(key: string): Promise<any>
	get(key: string, options?: any): Promise<any>
	put(key: string, value: any, options?: any): Promise<any>
}

// Cloudflare's caches global has a 'default' property for the default cache
declare const caches: {
	default: {
		match(request: unknown): Promise<Response | undefined>
		put(request: unknown, response: Response): Promise<void>
	}
}

/**
 * Handles asset upload requests to Cloudflare R2 storage with conflict detection.
 * Checks if the asset already exists and returns a 409 Conflict status if found,
 * otherwise uploads the asset with the provided HTTP metadata.
 *
 * @param options - Configuration object for the upload
 *   - objectName - Unique identifier for the asset in R2 storage
 *   - bucket - Cloudflare R2 bucket instance for storage
 *   - body - ReadableStream containing the asset data to upload
 *   - headers - HTTP headers to store as metadata with the asset
 * @returns Promise resolving to JSON response with object name and ETag, or 409 if exists
 *
 * @example
 * ```ts
 * router.put('/assets/:objectName', async (request, env) => {
 *   const { objectName } = request.params
 *
 *   return handleUserAssetUpload({
 *     objectName,
 *     bucket: env.ASSETS_BUCKET,
 *     body: request.body,
 *     headers: request.headers,
 *   })
 * })
 * ```
 *
 * @public
 */
export async function handleUserAssetUpload({
	body,
	headers,
	bucket,
	objectName,
}: {
	objectName: string
	bucket: R2BucketLike
	body: ReadableStream | null
	headers: Headers
}): Promise<Response> {
	if (await bucket.head(objectName)) {
		return Response.json({ error: 'Asset already exists' }, { status: 409 })
	}

	const object = await bucket.put(objectName, body, {
		httpMetadata: headers,
	})

	return Response.json({ object: objectName }, { headers: { etag: object.httpEtag } })
}

/**
 * Handles asset retrieval requests from Cloudflare R2 storage with comprehensive caching and range support.
 * Provides automatic caching via Cloudflare's cache API, supports partial content requests (range headers),
 * and includes proper CORS headers for cross-origin access. Assets are cached with immutable headers
 * for optimal performance.
 *
 * @param options - Configuration object for asset retrieval
 *   - request - HTTP request containing potential range headers and cache keys
 *   - bucket - Cloudflare R2 bucket instance containing the asset
 *   - objectName - Unique identifier of the asset to retrieve
 *   - context - Execution context for background caching operations
 * @returns Promise resolving to the asset response with appropriate headers and caching
 *
 * @example
 * ```ts
 * router.get('/assets/:objectName', async (request, env, ctx) => {
 *   const { objectName } = request.params
 *
 *   return handleUserAssetGet({
 *     request,
 *     bucket: env.ASSETS_BUCKET,
 *     objectName,
 *     context: ctx,
 *   })
 * })
 * ```
 *
 * @public
 */
export async function handleUserAssetGet({
	request,
	bucket,
	objectName,
	context,
}: {
	request: IRequest
	bucket: R2BucketLike
	objectName: string
	context: ExecutionContext
}): Promise<Response> {
	// this cache automatically handles range responses etc.
	const cacheKey = new Request(request.url, { headers: request.headers }) as unknown as Parameters<
		typeof caches.default.match
	>[0]
	const cachedResponse = await caches.default.match(cacheKey)
	if (cachedResponse) {
		return cachedResponse as unknown as Response
	}

	const object = await bucket.get(objectName, {
		range: request.headers,
		onlyIf: request.headers,
	})

	if (!object) {
		return notFound()
	}

	const headers = new Headers()
	object.writeHttpMetadata(headers)

	// assets are immutable, so we can cache them basically forever:
	headers.set('cache-control', 'public, max-age=31536000, immutable')
	headers.set('etag', object.httpEtag)

	// we set CORS headers so all clients can access assets. we do this here so our `cors` helper in
	// worker.ts doesn't try to set extra cors headers on responses that have been read from the
	// cache, which isn't allowed by cloudflare.
	headers.set('access-control-allow-origin', '*')

	// cloudflare doesn't set the content-range header automatically in writeHttpMetadata, so we
	// need to do it ourselves.
	let contentRange
	if (object.range) {
		if ('suffix' in object.range) {
			const start = object.size - object.range.suffix
			const end = object.size - 1
			contentRange = `bytes ${start}-${end}/${object.size}`
		} else {
			const start = object.range.offset ?? 0
			const end = object.range.length ? start + object.range.length - 1 : object.size - 1
			if (start !== 0 || end !== object.size - 1) {
				contentRange = `bytes ${start}-${end}/${object.size}`
			}
		}
	}

	if (contentRange) {
		headers.set('content-range', contentRange)
	}

	const body = 'body' in object && object.body ? object.body : null
	const status = body ? (contentRange ? 206 : 200) : 304

	if (status === 200) {
		const [cacheBody, responseBody] = body!.tee()
		// cache the response
		context.waitUntil(
			caches.default.put(cacheKey, new Response(cacheBody as BodyInit, { headers, status }))
		)
		return new Response(responseBody as BodyInit, { headers, status })
	}

	return new Response(body as BodyInit | null, { headers, status })
}
