import { resolveImage } from './types'
import type {
	GenerateParams,
	GenerateResult,
	ImageProvider,
	UpscaleParams,
	UpscaleResult,
} from './types'

const FLUX_MODELS: Record<string, string> = {
	'flux-schnell': 'black-forest-labs/flux-schnell',
	'flux-pro': 'black-forest-labs/flux-1.1-pro',
	'flux-dev': 'black-forest-labs/flux-dev',
}

const GOOGLE_MODELS: Record<string, string> = {
	'nano-banana-pro': 'google/nano-banana-pro',
	'nano-banana': 'google/nano-banana',
	'imagen-4-fast': 'google/imagen-4-fast',
}

const CONTROLNET_MODELS: Record<string, string> = {
	canny: 'black-forest-labs/flux-canny-dev',
	depth: 'black-forest-labs/flux-depth-dev',
	// No Flux-native pose/segmentation models — fall back to canny/depth
	pose: 'black-forest-labs/flux-canny-dev',
	segmentation: 'black-forest-labs/flux-depth-dev',
}

interface ReplicateOutput {
	output?: string | string[]
	seed?: number
}

/**
 * Run a Replicate prediction synchronously (`Prefer: wait`) and return the parsed response.
 * `target` is either an official model path (`owner/name`) or a `{ version }` hash.
 */
export async function replicatePredict(
	target: string | { version: string },
	input: Record<string, unknown>,
	apiToken: string,
	label = 'Replicate'
): Promise<ReplicateOutput> {
	const url =
		typeof target === 'string'
			? `https://api.replicate.com/v1/models/${target}/predictions`
			: 'https://api.replicate.com/v1/predictions'
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiToken}`,
			Prefer: 'wait',
		},
		body: JSON.stringify(typeof target === 'string' ? { input } : { ...target, input }),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`${label} error ${response.status}: ${text}`)
	}

	return (await response.json()) as ReplicateOutput
}

export function firstOutput(data: ReplicateOutput): string | undefined {
	return Array.isArray(data.output) ? data.output[0] : data.output
}

function requireApiToken(env: Env): string {
	if (!env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN is not configured')
	return env.REPLICATE_API_TOKEN
}

export const replicate: ImageProvider = {
	name: 'replicate',

	async generate(params: GenerateParams, env: Env): Promise<GenerateResult> {
		const apiToken = requireApiToken(env)

		if (params.controlNetMode && params.referenceImageUrl) {
			return generateWithControlNet(params, apiToken, env)
		}
		if (Object.hasOwn(GOOGLE_MODELS, params.modelId)) {
			return generateWithGoogle(params, apiToken)
		}
		return generateWithFlux(params, apiToken)
	},

	async upscale(params: UpscaleParams, env: Env): Promise<UpscaleResult> {
		const data = await replicatePredict(
			'nightmareai/real-esrgan',
			{ image: params.imageUrl, scale: params.scale },
			requireApiToken(env),
			'Replicate upscale'
		)
		return { imageUrl: data.output as string }
	},
}

function toGenerateResult(data: ReplicateOutput, params: GenerateParams): GenerateResult {
	return { imageUrl: firstOutput(data)!, seed: data.seed ?? params.seed ?? 0 }
}

async function generateWithFlux(params: GenerateParams, apiToken: string): Promise<GenerateResult> {
	const data = await replicatePredict(
		FLUX_MODELS[params.modelId] ?? FLUX_MODELS['flux-dev'],
		{
			prompt: params.prompt,
			num_inference_steps: params.steps ?? 20,
			guidance: params.cfgScale ?? 7,
			seed: params.seed ?? null,
			aspect_ratio: '1:1',
			// Flux Pro uses safety_tolerance (1=strictest), others use disable_safety_checker
			...(params.modelId === 'flux-pro'
				? { safety_tolerance: 1 }
				: { disable_safety_checker: false }),
			...(params.referenceImageUrl ? { image: params.referenceImageUrl } : {}),
		},
		apiToken
	)
	return toGenerateResult(data, params)
}

async function generateWithGoogle(
	params: GenerateParams,
	apiToken: string
): Promise<GenerateResult> {
	const data = await replicatePredict(
		GOOGLE_MODELS[params.modelId],
		{
			prompt: params.prompt,
			aspect_ratio: '1:1',
			...(params.referenceImageUrl ? { image_input: [params.referenceImageUrl] } : {}),
		},
		apiToken,
		'Replicate Google model'
	)
	return toGenerateResult(data, params)
}

async function generateWithControlNet(
	params: GenerateParams,
	apiToken: string,
	env: Env
): Promise<GenerateResult> {
	const model = CONTROLNET_MODELS[params.controlNetMode!] ?? CONTROLNET_MODELS.canny

	// Replicate accepts https URLs and data URIs directly; only R2 paths need resolving.
	let controlImage = params.referenceImageUrl!
	if (controlImage.startsWith('/api/images/')) {
		controlImage = (await resolveImage(controlImage, env)).dataUrl
	}

	const data = await replicatePredict(
		model,
		{
			control_image: controlImage,
			prompt: params.prompt,
			num_inference_steps: params.steps ?? 28,
			guidance: params.cfgScale ?? 30,
			...(params.seed != null ? { seed: params.seed } : {}),
			output_format: 'png',
			disable_safety_checker: false,
		},
		apiToken,
		'Replicate ControlNet'
	)
	return toGenerateResult(data, params)
}
