import { AutoRouter, error, IRequest } from 'itty-router'
import { handleAnimate } from './routes/animate'
import { handleFalProxy } from './routes/falProxy'

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

	// Turn a generated image into a short video (secondary, non-realtime).
	.post('/api/animate', handleAnimate)

	.all('*', () => new Response('Not found', { status: 404 }))

export default {
	fetch: router.fetch,
}
