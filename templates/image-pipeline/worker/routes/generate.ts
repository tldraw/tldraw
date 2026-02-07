import { IRequest } from 'itty-router'

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

	const [provider] = (body.model ?? 'stable-diffusion:sdxl').split(':')

	try {
		let result: GenerateResult

		switch (provider) {
			case 'stable-diffusion':
				result = await generateWithStabilityAI(body, env)
				break
			case 'flux':
				result = await generateWithFal(body, env)
				break
			case 'dalle':
				result = await generateWithOpenAI(body, env)
				break
			default:
				// Fall back to the built-in placeholder generator for
				// providers that don't have API keys configured.
				result = generatePlaceholder(body)
				break
		}

		// Optionally persist the image to R2.
		if (env.IMAGE_BUCKET && result.imageUrl.startsWith('data:')) {
			const imageId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
			const blob = dataUrlToBlob(result.imageUrl)
			await env.IMAGE_BUCKET.put(imageId, blob, {
				httpMetadata: { contentType: 'image/png' },
			})
			result.imageUrl = `/api/images/${imageId}`
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

interface GenerateResult {
	imageUrl: string
	seed: number
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

/**
 * Generate via Stability AI (Stable Diffusion) REST API.
 * Requires STABILITY_API_KEY environment variable.
 */
async function generateWithStabilityAI(body: GenerateRequest, env: Env): Promise<GenerateResult> {
	const apiKey = env.STABILITY_API_KEY
	if (!apiKey) {
		return generatePlaceholder(body)
	}

	const [, modelId] = (body.model ?? ':sdxl').split(':')
	const engineId =
		modelId === 'sd-3'
			? 'stable-diffusion-v3'
			: modelId === 'sd-1.5'
				? 'stable-diffusion-v1-6'
				: 'stable-diffusion-xl-1024-v1-0'

	const response = await fetch(`https://api.stability.ai/v1/generation/${engineId}/text-to-image`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			text_prompts: [
				{ text: body.prompt, weight: 1 },
				...(body.negativePrompt ? [{ text: body.negativePrompt, weight: -1 }] : []),
			],
			cfg_scale: body.cfgScale ?? 7,
			steps: body.steps ?? 20,
			seed: body.seed ?? 0,
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
 * Generate via fal.ai (Flux models).
 * Requires FAL_API_KEY environment variable.
 */
async function generateWithFal(body: GenerateRequest, env: Env): Promise<GenerateResult> {
	const apiKey = env.FAL_API_KEY
	if (!apiKey) {
		return generatePlaceholder(body)
	}

	const [, modelId] = (body.model ?? ':flux-dev').split(':')
	const falModel =
		modelId === 'flux-schnell'
			? 'fal-ai/flux/schnell'
			: modelId === 'flux-pro'
				? 'fal-ai/flux-pro/v1.1'
				: 'fal-ai/flux/dev'

	const response = await fetch(`https://fal.run/${falModel}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Key ${apiKey}`,
		},
		body: JSON.stringify({
			prompt: body.prompt,
			num_inference_steps: body.steps ?? 20,
			guidance_scale: body.cfgScale ?? 7,
			seed: body.seed ?? null,
			image_size: 'square_hd',
		}),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`fal.ai error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as {
		images: Array<{ url: string }>
		seed: number
	}
	return {
		imageUrl: data.images[0].url,
		seed: data.seed ?? body.seed ?? 0,
	}
}

/**
 * Generate via OpenAI DALL-E API.
 * Requires OPENAI_API_KEY environment variable.
 */
async function generateWithOpenAI(body: GenerateRequest, env: Env): Promise<GenerateResult> {
	const apiKey = env.OPENAI_API_KEY
	if (!apiKey) {
		return generatePlaceholder(body)
	}

	const [, modelId] = (body.model ?? ':dall-e-3').split(':')

	const response = await fetch('https://api.openai.com/v1/images/generations', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: modelId === 'dall-e-2' ? 'dall-e-2' : 'dall-e-3',
			prompt: body.prompt,
			n: 1,
			size: '1024x1024',
			response_format: 'b64_json',
		}),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`OpenAI error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as {
		data: Array<{ b64_json: string }>
	}
	return {
		imageUrl: `data:image/png;base64,${data.data[0].b64_json}`,
		seed: body.seed ?? 0,
	}
}

/**
 * Generate a placeholder SVG image when no API key is configured.
 * This lets the template work out of the box without any API keys.
 */
function generatePlaceholder(body: GenerateRequest): GenerateResult {
	const seed = body.seed ?? Math.floor(Math.random() * 100000)
	const hue = (seed * 137.508) % 360
	const steps = body.steps ?? 20
	const prompt = body.prompt.slice(0, 40)

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
		<defs>
			<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="hsl(${hue}, 50%, 35%)"/>
				<stop offset="100%" stop-color="hsl(${(hue + 60) % 360}, 40%, 50%)"/>
			</linearGradient>
		</defs>
		<rect width="1024" height="1024" fill="url(#bg)"/>
		<text x="512" y="480" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="sans-serif" font-size="24" font-weight="bold">${prompt}</text>
		<text x="512" y="520" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="16">seed: ${seed} · steps: ${steps}</text>
		<text x="512" y="560" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-family="sans-serif" font-size="14">placeholder — configure API keys for real generation</text>
	</svg>`

	return {
		imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
		seed,
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
		return bytes.buffer
	}
	// For SVG data URLs, just encode as UTF-8
	return new TextEncoder().encode(decodeURIComponent(base64)).buffer
}
