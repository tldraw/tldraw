import { AutoRouter, error, IRequest } from 'itty-router'
import { handleGenerate } from './routes/generate'
import { handlePlan } from './routes/plan'

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

	.all('*', () => new Response('Not found', { status: 404 }))

export default {
	fetch: router.fetch,
}
