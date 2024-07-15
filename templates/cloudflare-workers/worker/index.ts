import { AutoRouter, cors, error, IRequest } from 'itty-router'
import { Environment } from './types'

export { TldrawDurableObject } from './TldrawDurableObject'

const { preflight, corsify } = cors()
const router = AutoRouter<IRequest, [env: Environment]>({
	before: [preflight],
	finally: [corsify],
	catch: (e) => {
		console.log(e)
		return error(e)
	},
})
	// requests to /connect are routed to the Durable Object, and handle realtime websocket syncing
	.get('/connect/:roomId', (request, env) => {
		const id = env.TLDRAW_DURABLE_OBJECT.idFromName(request.params.roomId)
		const room = env.TLDRAW_DURABLE_OBJECT.get(id)
		return room.fetch(request.url, { headers: request.headers, body: request.body })
	})

	// assets can be uploaded to the bucket under /uploads
	.post('/uploads/:uploadId', async (request, env) => {
		const name = `uploads/${request.params.uploadId}`

		const contentType = request.headers.get('content-type') ?? ''
		if (!contentType.startsWith('image/') || !contentType.startsWith('video/')) {
			return error(400, 'Invalid content type')
		}

		if (await env.TLDRAW_BUCKET.head(name)) {
			return error(409, 'Upload already exists')
		}

		await env.TLDRAW_BUCKET.put(name, request.body, {
			httpMetadata: request.headers,
		})

		return { ok: true }
	})

	// they can be retrieved from the bucket too
	.get('/uploads/:uploadId', async (request, env) => {
		const name = `uploads/${request.params.uploadId}`
		const object = await env.TLDRAW_BUCKET.get(name, {
			range: request.headers,
			onlyIf: request.headers,
		})

		if (!object) {
			return error(404, 'Upload not found')
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

		const body = 'body' in object && object.body ? object.body : null
		const status = body ? (request.headers.get('range') !== null ? 206 : 200) : 304
		return new Response(body, { headers, status })
	})

export default router
