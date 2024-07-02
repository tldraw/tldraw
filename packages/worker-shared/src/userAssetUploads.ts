import { ExecutionContext, R2Bucket } from '@cloudflare/workers-types'
import { notFound } from './errors'

interface UserAssetOpts {
	request: Request
	bucket: R2Bucket
	objectName: string
	context: ExecutionContext
}

export async function handleUserAssetUpload({
	request,
	bucket,
	objectName,
}: UserAssetOpts): Promise<Response> {
	if (await bucket.head(objectName)) {
		return Response.json({ error: 'Asset already exists' }, { status: 409 })
	}

	const object = await bucket.put(objectName, request.body, {
		httpMetadata: request.headers,
	})

	return Response.json({ object: objectName }, { headers: { etag: object.httpEtag } })
}

export async function handleUserAssetGet({ request, bucket, objectName, context }: UserAssetOpts) {
	const cacheUrl = new URL(request.url)
	const cacheKey = new Request(cacheUrl.toString(), request)

	// this cache automatically handles range responses etc.
	const cachedResponse = await caches.default.match(cacheKey)
	if (cachedResponse) {
		return cachedResponse
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
	headers.set('etag', object.httpEtag)
	if (object.range) {
		let start
		let end
		if ('suffix' in object.range) {
			start = object.size - object.range.suffix
			end = object.size - 1
		} else {
			start = object.range.offset ?? 0
			end = object.range.length ? start + object.range.length - 1 : object.size - 1
		}
		headers.set('content-range', `bytes ${start}-${end}/${object.size}`)
	}
	// assets are immutable, so we can cache them basically forever:
	headers.set('cache-control', 'public, max-age=31536000, immutable')

	const body = 'body' in object && object.body ? object.body : null
	const status = body ? (request.headers.get('range') !== null ? 206 : 200) : 304

	if (status === 200) {
		const [cacheBody, responseBody] = body!.tee()
		// cache the response
		context.waitUntil(caches.default.put(cacheKey, new Response(cacheBody, { headers, status })))
		return new Response(responseBody, { headers, status })
	}

	return new Response(body, { headers, status })
}
