import { AutoRouter, error, IRequest } from 'itty-router'
import { handleGenerate } from './routes/generate'
import { handleImageDownload, handleImageUpload } from './routes/images'
import { handleUpscale } from './routes/upscale'

const router = AutoRouter<IRequest, [env: Env, ctx: ExecutionContext]>({
	catch: (e) => {
		console.error(e)
		return error(e)
	},
})
	// Image generation endpoint — accepts prompt, model, and parameters
	.post('/api/generate', handleGenerate)

	// Upscale endpoint — accepts an image URL and scale factor
	.post('/api/upscale', handleUpscale)

	// Upload/download generated images to/from R2 bucket
	.post('/api/images/:imageId', handleImageUpload)
	.get('/api/images/:imageId', handleImageDownload)

	.all('*', () => new Response('Not found', { status: 404 }))

export default {
	fetch: router.fetch,
}
