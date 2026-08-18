import { error, IRequest, json } from 'itty-router'
import { getProvider } from '../providers'
import type { GenerateParams } from '../providers'
import { resolveImage } from '../providers/types'

interface GenerateRequest {
	/** "provider:model", e.g. "flux:flux-dev" */
	model: string
	prompt: string
	negativePrompt?: string
	steps?: number
	cfgScale?: number
	seed?: number
	controlNetMode?: string
	/** 0-100 */
	controlNetStrength?: number
	referenceImageUrl?: string
}

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
