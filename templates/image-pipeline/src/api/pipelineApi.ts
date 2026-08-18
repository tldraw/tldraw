/**
 * Frontend API client for the Cloudflare Worker backend. Each function corresponds to a worker
 * endpoint.
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

export function apiGenerateText(params: GenerateTextParams) {
	// Coerce input to string so the worker always receives a string
	const body = { ...params, input: params.input != null ? String(params.input) : undefined }
	return postJson<GenerateTextResult>('/api/generate-text', body, 'Text generation failed')
}
