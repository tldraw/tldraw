import { placeholder } from './placeholder'
import type {
	GenerateParams,
	GenerateResult,
	ImageProvider,
	UpscaleParams,
	UpscaleResult,
} from './types'
import { resolveImage } from './types'

export const stability: ImageProvider = {
	name: 'stability',

	async generate(params: GenerateParams, env: Env): Promise<GenerateResult> {
		const apiKey = env.STABILITY_API_KEY
		if (!apiKey) {
			return placeholder.generate(params, env)
		}

		// Use image-to-image when ControlNet params are present
		if (params.controlNetMode && params.referenceImageUrl) {
			return generateImageToImage(params, apiKey, env)
		}

		return generateTextToImage(params, apiKey)
	},

	async upscale(params: UpscaleParams, env: Env): Promise<UpscaleResult> {
		const apiKey = env.STABILITY_API_KEY
		if (!apiKey) {
			return placeholder.upscale!(params, env)
		}

		const response = await fetch(
			'https://api.stability.ai/v1/generation/esrgan-v1-x2plus/image-to-image/upscale',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					image: params.imageUrl,
					width: 1024 * params.scale,
				}),
			}
		)

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Stability AI upscale error ${response.status}: ${text}`)
		}

		const data = (await response.json()) as {
			artifacts: Array<{ base64: string }>
		}
		return {
			imageUrl: `data:image/png;base64,${data.artifacts[0].base64}`,
		}
	},
}

async function generateTextToImage(
	params: GenerateParams,
	apiKey: string
): Promise<GenerateResult> {
	const engineId = resolveEngineId(params.modelId)

	const response = await fetch(`https://api.stability.ai/v1/generation/${engineId}/text-to-image`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			text_prompts: [
				{ text: params.prompt, weight: 1 },
				...(params.negativePrompt ? [{ text: params.negativePrompt, weight: -1 }] : []),
			],
			cfg_scale: params.cfgScale ?? 7,
			steps: params.steps ?? 20,
			seed: params.seed ?? 0,
			width: 1024,
			height: 1024,
		}),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Stability AI error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as {
		artifacts: Array<{ base64: string; seed: number }>
	}
	const artifact = data.artifacts[0]
	return {
		imageUrl: `data:image/png;base64,${artifact.base64}`,
		seed: artifact.seed,
	}
}

/**
 * Use the Stability AI image-to-image endpoint for ControlNet-style generation.
 * The reference image is uploaded as the init_image, and controlNetStrength
 * maps to image_strength (how much the init image influences the output).
 */
async function generateImageToImage(
	params: GenerateParams,
	apiKey: string,
	env: Env
): Promise<GenerateResult> {
	const engineId = resolveEngineId(params.modelId)
	const { blob } = await resolveImage(params.referenceImageUrl!, env)

	const formData = new FormData()
	formData.append('init_image', blob, 'image.png')
	formData.append('init_image_mode', 'IMAGE_STRENGTH')
	// controlNetStrength 0-100 → image_strength 0-1
	// Higher strength = more influence from the reference image
	formData.append('image_strength', String((params.controlNetStrength ?? 75) / 100))
	formData.append('text_prompts[0][text]', params.prompt)
	formData.append('text_prompts[0][weight]', '1')
	if (params.negativePrompt) {
		formData.append('text_prompts[1][text]', params.negativePrompt)
		formData.append('text_prompts[1][weight]', '-1')
	}
	formData.append('cfg_scale', String(params.cfgScale ?? 7))
	formData.append('steps', String(params.steps ?? 20))
	if (params.seed != null) {
		formData.append('seed', String(params.seed))
	}

	const response = await fetch(
		`https://api.stability.ai/v1/generation/${engineId}/image-to-image`,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${apiKey}` },
			body: formData,
		}
	)

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Stability AI image-to-image error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as {
		artifacts: Array<{ base64: string; seed: number }>
	}
	const artifact = data.artifacts[0]
	return {
		imageUrl: `data:image/png;base64,${artifact.base64}`,
		seed: artifact.seed,
	}
}

function resolveEngineId(modelId: string): string {
	return modelId === 'sd-3'
		? 'stable-diffusion-v3'
		: modelId === 'sd-1.5'
			? 'stable-diffusion-v1-6'
			: 'stable-diffusion-xl-1024-v1-0'
}
