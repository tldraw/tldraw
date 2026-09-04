/**
 * Frontend API client for calling the Cloudflare Worker backend.
 * Each function corresponds to a worker endpoint.
 */

async function postJson<Result>(path: string, body: unknown, failureMessage: string) {
	try {
		const response = await fetch(path, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})

		if (!response.ok) {
			const err = await response.json().catch(() => ({ error: response.statusText }))
			throw new Error((err as { error?: string }).error ?? failureMessage)
		}

		return (await response.json()) as Result
	} catch (e) {
		throw new Error(`Backend unavailable: ${e instanceof Error ? e.message : e}`)
	}
}

export interface GenerateParams {
	model: string
	prompt: string
	negativePrompt?: string
	steps?: number
	cfgScale?: number
	seed?: number
	controlNetMode?: string
	controlNetStrength?: number
	referenceImageUrl?: string
}

export interface GenerateResult {
	imageUrl: string
	seed: number
}

/**
 * Call the /api/generate endpoint to create an AI-generated image.
 * Falls back to a local placeholder if the worker is not available.
 */
export function apiGenerate(params: GenerateParams) {
	return postJson<GenerateResult>('/api/generate', params, 'Generation failed')
}

export interface UpscaleParams {
	imageUrl: string
	scale: number
	method: string
}

export interface UpscaleResult {
	imageUrl: string
}

/**
 * Call the /api/upscale endpoint to upscale an image.
 */
export function apiUpscale(params: UpscaleParams) {
	return postJson<UpscaleResult>('/api/upscale', params, 'Upscale failed')
}

export interface IPAdapterParams {
	imageUrl: string
	prompt: string
	scale: number
	steps: number
}

export interface IPAdapterResult {
	imageUrl: string
}

/**
 * Call the /api/ip-adapter endpoint to generate an image guided by a reference.
 */
export function apiIPAdapter(params: IPAdapterParams) {
	return postJson<IPAdapterResult>('/api/ip-adapter', params, 'IP-Adapter failed')
}

export interface StyleTransferParams {
	styleImageUrl: string
	contentImageUrl?: string
	prompt?: string
	model: string
	strength: number
}

export interface StyleTransferResult {
	imageUrl: string
}

/**
 * Call the /api/style-transfer endpoint to transfer style between images.
 */
export function apiStyleTransfer(params: StyleTransferParams) {
	return postJson<StyleTransferResult>('/api/style-transfer', params, 'Style transfer failed')
}

export interface GenerateTextParams {
	input?: string
	prompt: string
}

export interface GenerateTextResult {
	text: string
}

/**
 * Call the /api/generate-text endpoint to generate text from a multimodal AI model.
 * Falls back to a local placeholder if the worker is not available.
 */
export function apiGenerateText(params: GenerateTextParams) {
	// Coerce input to string so the worker always receives a string
	const body = { ...params, input: params.input != null ? String(params.input) : undefined }
	return postJson<GenerateTextResult>('/api/generate-text', body, 'Text generation failed')
}
