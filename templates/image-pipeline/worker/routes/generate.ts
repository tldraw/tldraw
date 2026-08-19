import { error, IRequest, json } from 'itty-router'
import { getProvider } from '../providers'
import type { GenerateParams } from '../providers'
import { resolveImage } from '../providers/types'

/**
 * Request body for the /api/generate endpoint.
 */
interface GenerateRequest {
	/** The provider:model string, e.g. "stable-diffusion:sdxl" */
	model: string
	/** The text prompt describing the desired image */
	prompt: string
	/** Optional negative prompt */
	negativePrompt?: string
	/** Number of inference steps (default: 20) */
	steps?: number
	/** Classifier-free guidance scale (default: 7) */
	cfgScale?: number
	/** Seed for reproducibility (default: random) */
	seed?: number
	/** ControlNet mode if applicable */
	controlNetMode?: string
	/** ControlNet strength (0-100) */
	controlNetStrength?: number
	/** Reference image URL for ControlNet */
	referenceImageUrl?: string
}

/**
 * POST /api/generate
 *
 * Calls an AI image generation provider and returns the generated image.
 * Supports multiple providers via the model string format "provider:model".
 *
 * Returns: { imageUrl: string, seed: number }
 */
export async function handleGenerate(request: IRequest, env: Env) {
	const body = (await request.json()) as GenerateRequest

	if (!body.prompt) return error(400, 'prompt is required')

	const [providerName, modelId] = (body.model ?? 'flux:flux-dev').split(':')
	const params: GenerateParams = {
		modelId: modelId ?? '',
		prompt: body.prompt,
		negativePrompt: body.negativePrompt,
		steps: body.steps ?? 20,
		cfgScale: body.cfgScale ?? 7,
		seed: body.seed ?? null,
		controlNetMode: body.controlNetMode,
		controlNetStrength: body.controlNetStrength,
		referenceImageUrl: body.referenceImageUrl,
	}

	let result = await getProvider(providerName).generate(params, env)

	// Optionally persist the image to R2.
	if (env.IMAGE_BUCKET && result.imageUrl?.startsWith('data:')) {
		const imageId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
		const { blob } = await resolveImage(result.imageUrl, env)
		await env.IMAGE_BUCKET.put(imageId, blob, {
			httpMetadata: { contentType: 'image/png' },
		})
		result = { ...result, imageUrl: `/api/images/${imageId}` }
	}

	return json(result)
}
