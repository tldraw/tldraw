import { IRequest } from 'itty-router'
import type { GenerateParams } from '../providers'
import { getProvider } from '../providers'

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

	if (!body.prompt) {
		return new Response(JSON.stringify({ error: 'prompt is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const [providerName, modelId] = (body.model ?? 'flux:flux-dev').split(':')

	try {
		const provider = getProvider(providerName)
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

		let result = await provider.generate(params, env)

		// Optionally persist the image to R2.
		if (env.IMAGE_BUCKET && result.imageUrl?.startsWith('data:')) {
			const imageId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
			const blob = dataUrlToBlob(result.imageUrl)
			await env.IMAGE_BUCKET.put(imageId, blob, {
				httpMetadata: { contentType: 'image/png' },
			})
			result = { ...result, imageUrl: `/api/images/${imageId}` }
		}

		return new Response(JSON.stringify(result), {
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (e: any) {
		console.error('Generate error:', e)
		return new Response(JSON.stringify({ error: e.message ?? 'Generation failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function dataUrlToBlob(dataUrl: string): ArrayBuffer {
	const [header, base64] = dataUrl.split(',')
	if (header.includes('base64')) {
		const binary = atob(base64)
		const bytes = new Uint8Array(binary.length)
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i)
		}
		return bytes.buffer as ArrayBuffer
	}
	// For SVG data URLs, just encode as UTF-8
	return new TextEncoder().encode(decodeURIComponent(base64)).buffer as ArrayBuffer
}
