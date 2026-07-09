import { AutoRouter, error, IRequest } from 'itty-router'
import { handleAnimate } from './routes/animate'
import { handleDescribe } from './routes/describe'
import { handleFalProxy } from './routes/falProxy'
import { handlePose } from './routes/pose'

const router = AutoRouter<IRequest, [env: Env, ctx: ExecutionContext]>({
	catch: (e) => {
		console.error(e)
		return error(e)
	},
})
	// fal.ai proxy. The browser fal client points at this via
	// `fal.config({ proxyUrl: '/api/fal/proxy' })`. It handles both the realtime
	// JWT token handshake and any REST calls, injecting FAL_KEY server-side.
	.get('/api/fal/proxy', handleFalProxy)
	.post('/api/fal/proxy', handleFalProxy)

	// Auto-generate an image prompt from the current sketch (Claude vision), so
	// the user doesn't have to type one. The ANTHROPIC_API_KEY is injected
	// server-side, mirroring the fal proxy.
	.post('/api/describe', handleDescribe)

	// Read a 2D pose (named joint keypoints + coarse depth hints) out of the
	// current sketch (Claude vision), for retargeting onto the 3D rig. Same
	// server-side-key discipline as /api/describe.
	.post('/api/pose', handlePose)

	// Turn a generated image into a short video (secondary, non-realtime).
	.post('/api/animate', handleAnimate)

	.all('*', () => new Response('Not found', { status: 404 }))

export default {
	fetch: router.fetch,
}
