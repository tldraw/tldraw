import { error, IRequest, json } from 'itty-router'
import { firstOutput, replicatePredict } from '../providers/replicate'
import { persistImage, placeholderImage, resolveImage } from '../providers/types'

interface StyleTransferRequest {
	styleImageUrl: string
	contentImageUrl?: string
	prompt?: string
	model: string
	strength: number
}

const STYLE_MODELS = ['fast', 'high-quality', 'realistic', 'cinematic', 'animated']

/**
 * POST /api/style-transfer
 *
 * Transfers the style of one image onto another (or generates a new image
 * in that style) using fofr/style-transfer on Replicate.
 * Falls back to a placeholder if no API key.
 */
export async function handleStyleTransfer(request: IRequest, env: Env) {
	const body = (await request.json()) as StyleTransferRequest

	if (!body.styleImageUrl) return error(400, 'styleImageUrl is required')

	const apiKey = env.REPLICATE_API_TOKEN
	if (!apiKey) {
		const model = body.model || 'fast'
		return json({
			imageUrl: placeholderImage(
				'Style Transfer',
				`${model} · strength ${body.strength} · placeholder`
			),
		})
	}

	const input: Record<string, unknown> = {
		style_image: (await resolveImage(body.styleImageUrl, env)).dataUrl,
		prompt: body.prompt || '',
		style_strength: body.strength ?? 0.5,
		// Map model variant to the Replicate model parameter
		model: STYLE_MODELS.includes(body.model) ? body.model : 'fast',
	}
	if (body.contentImageUrl) {
		input.structure_image = (await resolveImage(body.contentImageUrl, env)).dataUrl
	}

	const result = await replicatePredict(
		{ version: 'f1023890703bc0a5a3a2c21b5e498833be5f6ef6e70e9daf6b9b3a4fd8309cf0' },
		input,
		apiKey
	)
	const outputUrl = firstOutput(result)
	if (!outputUrl) throw new Error('No output from style transfer')

	// Persist to R2 if available
	const imageUrl = env.IMAGE_BUCKET ? await persistImage(outputUrl, env) : outputUrl
	return json({ imageUrl })
}
