import { handleUnfurlRequest } from 'cloudflare-workers-unfurl'
import { AutoRouter, error, IRequest } from 'itty-router'
import { handleAssetDownload, handleAssetUpload } from './assetUploads'

// make sure our sync durable object is made available to cloudflare
export { TldrawDurableObject } from './TldrawDurableObject'

const CALLS_BASE = 'https://rtc.live.cloudflare.com/apps'

// we use itty-router (https://itty.dev/) to handle routing.
const router = AutoRouter<IRequest, [env: Env, ctx: ExecutionContext]>({
	catch: (e) => {
		console.error(e)
		return error(e)
	},
})
	// requests to /connect are routed to the Durable Object, and handle realtime websocket syncing
	.get('/api/connect/:roomId', (request, env) => {
		const id = env.TLDRAW_DURABLE_OBJECT.idFromName(request.params.roomId)
		const room = env.TLDRAW_DURABLE_OBJECT.get(id)
		return room.fetch(request.url, { headers: request.headers, body: request.body })
	})

	// assets can be uploaded to the bucket under /uploads:
	.post('/api/uploads/:uploadId', handleAssetUpload)

	// they can be retrieved from the bucket too:
	.get('/api/uploads/:uploadId', handleAssetDownload)

	// bookmarks need to extract metadata from pasted URLs:
	.get('/api/unfurl', handleUnfurlRequest)

	// Cloudflare Calls: create a new session
	.post('/api/calls/session', async (_request, env) => {
		const response = await fetch(`${CALLS_BASE}/${env.CALLS_APP_ID}/sessions/new`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.CALLS_APP_SECRET}`,
				'Content-Type': 'application/json',
			},
		})
		const data = await response.json()
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' },
		})
	})

	// Cloudflare Calls: add tracks to a session (push local or pull remote)
	.post('/api/calls/session/:sessionId/tracks', async (request, env) => {
		const body = await request.json()
		const response = await fetch(
			`${CALLS_BASE}/${env.CALLS_APP_ID}/sessions/${request.params.sessionId}/tracks/new`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.CALLS_APP_SECRET}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			}
		)
		const data = await response.json()
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' },
		})
	})

	// Cloudflare Calls: renegotiate a session (complete SDP exchange)
	.put('/api/calls/session/:sessionId/renegotiate', async (request, env) => {
		const body = await request.json()
		const response = await fetch(
			`${CALLS_BASE}/${env.CALLS_APP_ID}/sessions/${request.params.sessionId}/renegotiate`,
			{
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${env.CALLS_APP_SECRET}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			}
		)
		const data = await response.json()
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' },
		})
	})

	// Cloudflare Calls: close a session
	.put('/api/calls/session/:sessionId/close', async (request, env) => {
		const response = await fetch(
			`${CALLS_BASE}/${env.CALLS_APP_ID}/sessions/${request.params.sessionId}/close`,
			{
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${env.CALLS_APP_SECRET}`,
					'Content-Type': 'application/json',
				},
			}
		)
		const data = await response.json()
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' },
		})
	})

	.all('*', () => {
		return new Response('Not found', { status: 404 })
	})

export default {
	fetch: router.fetch,
}
