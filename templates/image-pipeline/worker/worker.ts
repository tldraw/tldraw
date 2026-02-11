import { AutoRouter, error, IRequest } from 'itty-router'
import { handleGenerate } from './routes/generate'
import { handleGenerateText } from './routes/generateText'
import { handleImageDownload, handleImageUpload } from './routes/images'
import { handleIPAdapter } from './routes/ipAdapter'
import { handleStyleTransfer } from './routes/styleTransfer'
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

	// IP-Adapter endpoint — reference image + prompt guided generation
	.post('/api/ip-adapter', handleIPAdapter)

	// Style transfer endpoint — transfers style between images
	.post('/api/style-transfer', handleStyleTransfer)

	// Text generation endpoint — multimodal AI text generation
	.post('/api/generate-text', handleGenerateText)

	// Upload/download generated images to/from R2 bucket
	.post('/api/images/:imageId', handleImageUpload)
	.get('/api/images/:imageId', handleImageDownload)

	.all('*', () => new Response('Not found', { status: 404 }))

export default {
	fetch: router.fetch,
}
