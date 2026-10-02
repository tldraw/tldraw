import { retry } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { notFound } from './errors'

export const MAX_R2_OBJECT_NAME_BYTES = 1024

// These objects are served back from the app's own origin, so the Content-Type an upload arrives
// with decides what kind of document lives at that URL. The uploader picks it, which means without
// a check here an upload is a way to publish arbitrary content under a tldraw domain.
//
// Images and videos are stored and served as declared: no browser renders one as a document, and
// the CSP and nosniff headers set on the GET below keep that true for types it doesn't recognise.
// The whole image/* and video/* range is allowed rather than DEFAULT_SUPPORTED_MEDIA_TYPES because
// bookmark unfurls store whatever the remote site sends: favicons are routinely image/x-icon, and
// rewriting one to a download type stops it rendering in the bookmark shape.
//
// Everything else is stored as an opaque download: the type is replaced and the GET below marks it
// `content-disposition: attachment`, so a browser saves it instead of rendering it. An app whose
// assets fall outside that range (a PDF, say) names those types in extraInlineContentTypes.
const INLINE_CONTENT_TYPE_PREFIXES = ['image/', 'video/']
const DOWNLOAD_CONTENT_TYPE = 'application/octet-stream'

// R2 has no size limit of its own and the upload routes are open, so the body is bounded here.
// Comfortably above DEFAULT_MAX_ASSET_SIZE (10MB), which is what the editor allows a user to place.
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024

// A media type without its parameters (charset, codecs), so a type can't be smuggled past the
// inline check by appending one.
function contentTypeEssence(contentType: string | null): string {
	return (contentType ?? '').split(';')[0].trim().toLowerCase()
}

function isInlineContentType(
	essence: string,
	extraInlineContentTypes?: readonly string[]
): boolean {
	if (INLINE_CONTENT_TYPE_PREFIXES.some((prefix) => essence.startsWith(prefix))) return true
	return !!extraInlineContentTypes?.some((type) => contentTypeEssence(type) === essence)
}

/**
 * The stored content type for an upload: the declared one when a browser can safely render it, and
 * an opaque download type otherwise.
 */
function storedContentType(declared: string | null, extraInlineContentTypes?: readonly string[]) {
	const essence = contentTypeEssence(declared)
	return isInlineContentType(essence, extraInlineContentTypes) ? essence : DOWNLOAD_CONTENT_TYPE
}

function assetTooLarge() {
	return Response.json({ error: 'Asset too large' }, { status: 413 })
}

// The edge cache holds responses written before any of this existed, under `immutable` for a year,
// so a cache hit gets the same treatment as a fresh read rather than being served as it was stored.
function withContentDisposition(
	response: Response,
	extraInlineContentTypes?: readonly string[]
): Response {
	if (response.headers.has('content-disposition')) return response
	const essence = contentTypeEssence(response.headers.get('content-type'))
	if (isInlineContentType(essence, extraInlineContentTypes)) return response

	const headers = new Headers(response.headers)
	headers.set('content-disposition', 'attachment')
	// A 304 carries no body, and constructing one with a body throws.
	const body = response.status === 304 || response.status === 204 ? null : response.body
	return new Response(body as BodyInit | null, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

function isTransientWorkerError(error: unknown): boolean {
	const msg = String(error)
	return /internal error|connectivity|network connection lost|service temporarily unavailable|proxy request failed|unspecified error|connection (refused|reset|timed?\s?out)/i.test(
		msg
	)
}

function isInvalidObjectNameError(error: unknown): boolean {
	const msg = String(error)
	return msg.includes('The specified object name is not valid') || msg.includes('(10020)')
}

export function isValidR2ObjectName(objectName: string): boolean {
	return (
		objectName.length > 0 && new TextEncoder().encode(objectName).length <= MAX_R2_OBJECT_NAME_BYTES
	)
}

function invalidObjectNameResponse() {
	return Response.json({ error: 'Invalid object name' }, { status: 400 })
}

export const TRANSIENT_RETRY_OPTIONS = {
	attempts: 3,
	waitDuration: 500,
	matchError: isTransientWorkerError,
} as const

// Minimal interface for R2Bucket operations used in this file
// This avoids type conflicts between ambient and imported Cloudflare types
// Using 'any' for return types to allow compatibility with different R2Bucket type definitions
export interface R2BucketLike {
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
 *   - headers - HTTP headers of the upload request. Only `content-type` is kept, and only when it
 *     names a type safe to serve inline; anything else is stored as an opaque download.
 *   - extraInlineContentTypes - media types to serve inline on top of image/* and video/*, for
 *     apps that accept assets the editor doesn't render itself
 * @returns Promise resolving to JSON response with object name and ETag, 409 if exists, or 413 if
 * the body is over MAX_UPLOAD_SIZE_BYTES
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
	extraInlineContentTypes,
}: {
	objectName: string
	bucket: R2BucketLike
	body: ReadableStream | null
	headers: Headers
	extraInlineContentTypes?: readonly string[]
}): Promise<Response> {
	if (!isValidR2ObjectName(objectName)) return invalidObjectNameResponse()

	// The buffering below puts the whole body in the isolate, which a body well over the worker's
	// memory limit doesn't survive, so an upload that declares its size is turned away before it's
	// read. The check after buffering is the backstop for one that doesn't declare it.
	const declaredSize = Number(headers.get('content-length'))
	if (Number.isFinite(declaredSize) && declaredSize > MAX_UPLOAD_SIZE_BYTES) {
		return assetTooLarge()
	}

	try {
		const existing = await retry(() => bucket.head(objectName), TRANSIENT_RETRY_OPTIONS)
		if (existing) {
			return Response.json({ error: 'Asset already exists' }, { status: 409 })
		}

		// Buffer body so retries can re-send (ReadableStream is single-use)
		const buffer = body ? await new Response(body).arrayBuffer() : null

		if (buffer && buffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
			return assetTooLarge()
		}

		// Only the content type is carried over, and only after storedContentType has vetted it.
		// Passing the request's headers straight through let the uploader set contentDisposition,
		// contentEncoding and cacheControl on an object this worker serves from its own origin.
		const object = await retry(
			() =>
				bucket.put(objectName, buffer, {
					httpMetadata: {
						contentType: storedContentType(headers.get('content-type'), extraInlineContentTypes),
					},
				}),
			TRANSIENT_RETRY_OPTIONS
		)

		return Response.json({ object: objectName }, { headers: { etag: object.httpEtag } })
	} catch (error) {
		if (isInvalidObjectNameError(error)) return invalidObjectNameResponse()
		throw error
	}
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
 *   - extraInlineContentTypes - media types to serve inline on top of image/* and video/*, matching
 *     what the upload handler was given
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
	extraInlineContentTypes,
}: {
	request: IRequest
	bucket: R2BucketLike
	objectName: string
	context: ExecutionContext
	extraInlineContentTypes?: readonly string[]
}): Promise<Response> {
	if (!isValidR2ObjectName(objectName)) return invalidObjectNameResponse()

	// this cache automatically handles range responses etc.
	const cacheKey = new Request(request.url, { headers: request.headers })
	const cachedResponse = await caches.default.match(cacheKey)
	if (cachedResponse) {
		return withContentDisposition(cachedResponse, extraInlineContentTypes)
	}

	let object
	try {
		object = await retry(
			() => bucket.get(objectName, { range: request.headers, onlyIf: request.headers }),
			TRANSIENT_RETRY_OPTIONS
		)
	} catch (error) {
		if (isInvalidObjectNameError(error)) return invalidObjectNameResponse()
		throw error
	}

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

	// Prevent XSS from user-uploaded SVGs (or any file served with an executable content-type).
	// This is critical when assets are served from the same origin as the app.
	headers.set('content-security-policy', "default-src 'none'")
	headers.set('x-content-type-options', 'nosniff')

	// Uploads predating storedContentType carry whatever type they were sent with, so the check has
	// to happen on the way out as well as the way in. A non-media type is served as a download, not
	// as a document rendered under this origin.
	if (
		!isInlineContentType(contentTypeEssence(headers.get('content-type')), extraInlineContentTypes)
	) {
		headers.set('content-disposition', 'attachment')
	}

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
