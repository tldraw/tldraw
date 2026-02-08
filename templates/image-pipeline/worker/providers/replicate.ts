import { placeholder } from './placeholder'
import type {
	GenerateParams,
	GenerateResult,
	ImageProvider,
	UpscaleParams,
	UpscaleResult,
} from './types'
import { resolveImage } from './types'

/** Maps ControlNet mode IDs to Flux ControlNet model identifiers. */
const CONTROLNET_MODELS: Record<string, string> = {
	canny: 'black-forest-labs/flux-canny-dev',
	depth: 'black-forest-labs/flux-depth-dev',
	// No Flux-native pose/segmentation models — fall back to canny
	pose: 'black-forest-labs/flux-canny-dev',
	segmentation: 'black-forest-labs/flux-depth-dev',
}

export const replicate: ImageProvider = {
	name: 'replicate',

	async generate(params: GenerateParams, env: Env): Promise<GenerateResult> {
		const apiToken = env.REPLICATE_API_TOKEN
		if (!apiToken) {
			return placeholder.generate(params, env)
		}

		// Use a ControlNet model when ControlNet params are present
		if (params.controlNetMode && params.referenceImageUrl) {
			return generateWithControlNet(params, apiToken, env)
		}

		// Stable Diffusion models
		if (params.modelId === 'sdxl' || params.modelId === 'sd-3') {
			return generateWithSD(params, apiToken)
		}

		// Google models (Nano Banana, Imagen)
		if (
			params.modelId === 'nano-banana-pro' ||
			params.modelId === 'nano-banana' ||
			params.modelId === 'imagen-4-fast'
		) {
			return generateWithGoogle(params, apiToken)
		}

		return generateWithFlux(params, apiToken)
	},

	async upscale(params: UpscaleParams, env: Env): Promise<UpscaleResult> {
		const apiToken = env.REPLICATE_API_TOKEN
		if (!apiToken) {
			return placeholder.upscale!(params, env)
		}

		const response = await fetch(
			'https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiToken}`,
					Prefer: 'wait',
				},
				body: JSON.stringify({
					input: {
						image: params.imageUrl,
						scale: params.scale,
					},
				}),
			}
		)

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Replicate upscale error ${response.status}: ${text}`)
		}

		const data = (await response.json()) as { output: string }
		return { imageUrl: data.output }
	},
}

async function generateWithFlux(params: GenerateParams, apiToken: string): Promise<GenerateResult> {
	const replicateModel =
		params.modelId === 'flux-schnell'
			? 'black-forest-labs/flux-schnell'
			: params.modelId === 'flux-pro'
				? 'black-forest-labs/flux-1.1-pro'
				: 'black-forest-labs/flux-dev'

	const response = await fetch(
		`https://api.replicate.com/v1/models/${replicateModel}/predictions`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiToken}`,
				Prefer: 'wait',
			},
			body: JSON.stringify({
				input: {
					prompt: params.prompt,
					num_inference_steps: params.steps ?? 20,
					guidance: params.cfgScale ?? 7,
					seed: params.seed ?? null,
					aspect_ratio: '1:1',
					// Flux Pro uses safety_tolerance (1=strictest), others use disable_safety_checker
					...(params.modelId === 'flux-pro'
						? { safety_tolerance: 1 }
						: { disable_safety_checker: false }),
				},
			}),
		}
	)

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Replicate error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as {
		output: string | string[]
		seed?: number
	}

	const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output
	return {
		imageUrl,
		seed: data.seed ?? params.seed ?? 0,
	}
}

/**
 * Use a Stable Diffusion model on Replicate (SDXL or SD 3).
 */
async function generateWithSD(params: GenerateParams, apiToken: string): Promise<GenerateResult> {
	const replicateModel =
		params.modelId === 'sd-3' ? 'stability-ai/stable-diffusion-3' : 'stability-ai/sdxl'

	const response = await fetch(
		`https://api.replicate.com/v1/models/${replicateModel}/predictions`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiToken}`,
				Prefer: 'wait',
			},
			body: JSON.stringify({
				input: {
					prompt: params.prompt,
					...(params.negativePrompt ? { negative_prompt: params.negativePrompt } : {}),
					num_inference_steps: params.steps ?? 20,
					guidance_scale: params.cfgScale ?? 7,
					...(params.seed != null ? { seed: params.seed } : {}),
					width: 1024,
					height: 1024,
					disable_safety_checker: false,
				},
			}),
		}
	)

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Replicate SD error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as {
		output: string | string[]
		seed?: number
	}

	const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output
	return {
		imageUrl,
		seed: data.seed ?? params.seed ?? 0,
	}
}

/**
 * Use a Google model on Replicate (Nano Banana, Imagen).
 */
async function generateWithGoogle(
	params: GenerateParams,
	apiToken: string
): Promise<GenerateResult> {
	const modelMap: Record<string, string> = {
		'nano-banana-pro': 'google/nano-banana-pro',
		'nano-banana': 'google/nano-banana',
		'imagen-4-fast': 'google/imagen-4-fast',
	}
	const replicateModel = modelMap[params.modelId] ?? 'google/nano-banana-pro'

	const response = await fetch(
		`https://api.replicate.com/v1/models/${replicateModel}/predictions`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiToken}`,
				Prefer: 'wait',
			},
			body: JSON.stringify({
				input: {
					prompt: params.prompt,
					aspect_ratio: '1:1',
				},
			}),
		}
	)

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Replicate Google model error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as {
		output: string | string[]
		seed?: number
	}

	const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output
	return {
		imageUrl,
		seed: data.seed ?? params.seed ?? 0,
	}
}

/**
 * Use a Flux ControlNet model on Replicate.
 * The reference image is passed as the control image, and the mode
 * selects the appropriate variant (canny or depth).
 */
async function generateWithControlNet(
	params: GenerateParams,
	apiToken: string,
	env: Env
): Promise<GenerateResult> {
	const model = CONTROLNET_MODELS[params.controlNetMode!] ?? CONTROLNET_MODELS.canny

	// Replicate accepts https URLs and data URIs directly.
	// Only resolve R2 paths that Replicate can't access.
	let imageInput = params.referenceImageUrl!
	if (imageInput.startsWith('/api/images/')) {
		const { dataUrl } = await resolveImage(imageInput, env)
		imageInput = dataUrl
	}

	const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiToken}`,
			Prefer: 'wait',
		},
		body: JSON.stringify({
			input: {
				control_image: imageInput,
				prompt: params.prompt,
				num_inference_steps: params.steps ?? 28,
				guidance: params.cfgScale ?? 30,
				...(params.seed != null ? { seed: params.seed } : {}),
				output_format: 'png',
				disable_safety_checker: false,
			},
		}),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Replicate ControlNet error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as {
		output: string | string[]
		seed?: number
	}

	const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output
	return {
		imageUrl,
		seed: data.seed ?? params.seed ?? 0,
	}
}
