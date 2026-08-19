import { error, IRequest, json } from 'itty-router'
import { firstOutput, replicatePredict } from '../providers/replicate'
import { persistImage, placeholderImage, resolveImage } from '../providers/types'

interface IPAdapterRequest {
	imageUrl: string
	prompt: string
	scale: number
	steps: number
}

/**
 * POST /api/ip-adapter
 *
 * Generates an image guided by a reference image and text prompt using
 * IP-Adapter SDXL on Replicate. Falls back to a placeholder if no API key.
 */
export async function handleIPAdapter(request: IRequest, env: Env) {
	const body = (await request.json()) as IPAdapterRequest

	if (!body.imageUrl) return error(400, 'imageUrl is required')

	const apiKey = env.REPLICATE_API_TOKEN
	if (!apiKey) {
		const prompt = (body.prompt || 'IP-Adapter').slice(0, 30)
		return json({
			imageUrl: placeholderImage(prompt, `IP-Adapter · scale ${body.scale} · placeholder`),
		})
	}

	const { dataUrl } = await resolveImage(body.imageUrl, env)
	const result = await replicatePredict(
		{ version: '904dc004af1dba5c9b13fc9e41635aeb2f9a177896a396ab3393f3f6493dbdd4' },
		{
			image: dataUrl,
			prompt: body.prompt || 'best quality, high quality',
			scale: body.scale ?? 0.6,
			num_inference_steps: body.steps ?? 30,
		},
		apiKey
	)
	const outputUrl = firstOutput(result)
	if (!outputUrl) throw new Error('No output from IP-Adapter')

	// Persist to R2 if available
	const imageUrl = env.IMAGE_BUCKET ? await persistImage(outputUrl, env) : outputUrl
	return json({ imageUrl })
}
