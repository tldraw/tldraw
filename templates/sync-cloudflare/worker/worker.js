import { handleUnfurlRequest } from 'cloudflare-workers-unfurl'
import { AutoRouter, cors, error } from 'itty-router'
import { handleAssetDownload, handleAssetUpload } from './assetUploads'
// make sure our sync durable object is made available to cloudflare
export { TldrawDurableObject } from './TldrawDurableObject'
// we use itty-router (https://itty.dev/) to handle routing. in this example we turn on CORS because
// we're hosting the worker separately to the client. you should restrict this to your own domain.
var _a = cors({ origin: '*' }),
	preflight = _a.preflight,
	corsify = _a.corsify
var router = AutoRouter({
	before: [preflight],
	finally: [corsify],
	catch: function (e) {
		console.error(e)
		return error(e)
	},
})
	// requests to /connect are routed to the Durable Object, and handle realtime websocket syncing
	.get('/connect/:roomId', function (request, env) {
		var id = env.TLDRAW_DURABLE_OBJECT.idFromName(request.params.roomId)
		var room = env.TLDRAW_DURABLE_OBJECT.get(id)
		return room.fetch(request.url, { headers: request.headers, body: request.body })
	})
	// assets can be uploaded to the bucket under /uploads:
	.post('/uploads/:uploadId', handleAssetUpload)
	// they can be retrieved from the bucket too:
	.get('/uploads/:uploadId', handleAssetDownload)
	// bookmarks need to extract metadata from pasted URLs:
	.get('/unfurl', handleUnfurlRequest)
// export our router for cloudflare
export default router
