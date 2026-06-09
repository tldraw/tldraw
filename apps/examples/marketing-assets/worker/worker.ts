import { handleUnfurlRequest } from 'cloudflare-workers-unfurl'
import { AutoRouter, error, IRequest } from 'itty-router'
import { handleAssetDownload, handleAssetUpload } from './assetUploads'
import { handleClarify } from './routes/clarify'
import { handleGenerate } from './routes/generate'
import { handlePlan } from './routes/plan'

// make sure our sync durable object is made available to cloudflare
export { TldrawDurableObject } from './TldrawDurableObject'

const router = AutoRouter<IRequest, [env: Env, ctx: ExecutionContext]>({
	catch: (e) => {
		console.error(e)
		return error(e)
	},
})
	// Render or edit the text-free background image.
	.post('/api/generate', handleGenerate)

	// Plan the text layers (and, on revise, any background edits).
	.post('/api/plan', handlePlan)

	// Suggest clarifying questions for a brief before the first batch.
	.post('/api/clarify', handleClarify)

	// Realtime multiplayer: route websocket connections to the room's Durable Object.
	.get('/api/connect/:roomId', (request, env) => {
		const id = env.TLDRAW_DURABLE_OBJECT.idFromName(request.params.roomId)
		const room = env.TLDRAW_DURABLE_OBJECT.get(id)
		return room.fetch(request.url, { headers: request.headers, body: request.body })
	})

	// Generated backgrounds and any dropped media are stored in / served from R2.
	.post('/api/uploads/:uploadId', handleAssetUpload)
	.get('/api/uploads/:uploadId', handleAssetDownload)

	// Bookmarks need to extract metadata from pasted URLs.
	.get('/api/unfurl', handleUnfurlRequest)

	.all('*', () => new Response('Not found', { status: 404 }))

export default {
	fetch: router.fetch,
}
