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
	.post('/api/generate', handleGenerate)
	.post('/api/upscale', handleUpscale)
	.post('/api/ip-adapter', handleIPAdapter)
	.post('/api/style-transfer', handleStyleTransfer)
	.post('/api/generate-text', handleGenerateText)
	.post('/api/images/:imageId', handleImageUpload)
	.get('/api/images/:imageId', handleImageDownload)
	.all('*', () => new Response('Not found', { status: 404 }))

export default {
	fetch: router.fetch,
}
