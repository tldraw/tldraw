/**
 * Frontend API client for calling the Cloudflare Worker backend.
 * Each function corresponds to a worker endpoint.
 */

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
export async function apiGenerate(params: GenerateParams): Promise<GenerateResult> {
	try {
		const response = await fetch('/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params),
		})

		if (!response.ok) {
			const err = await response.json().catch(() => ({ error: response.statusText }))
			throw new Error((err as { error?: string }).error ?? 'Generation failed')
		}

		return (await response.json()) as GenerateResult
	} catch (e) {
		throw new Error(`Backend unavailable: ${e instanceof Error ? e.message : e}`)
	}
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
export async function apiUpscale(params: UpscaleParams): Promise<UpscaleResult> {
	try {
		const response = await fetch('/api/upscale', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params),
		})

		if (!response.ok) {
			const err = await response.json().catch(() => ({ error: response.statusText }))
			throw new Error((err as { error?: string }).error ?? 'Upscale failed')
		}

		return (await response.json()) as UpscaleResult
	} catch (e) {
		throw new Error(`Backend unavailable: ${e instanceof Error ? e.message : e}`)
	}
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
export async function apiIPAdapter(params: IPAdapterParams): Promise<IPAdapterResult> {
	try {
		const response = await fetch('/api/ip-adapter', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params),
		})

		if (!response.ok) {
			const err = await response.json().catch(() => ({ error: response.statusText }))
			throw new Error((err as { error?: string }).error ?? 'IP-Adapter failed')
		}

		return (await response.json()) as IPAdapterResult
	} catch (e) {
		throw new Error(`Backend unavailable: ${e instanceof Error ? e.message : e}`)
	}
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
export async function apiStyleTransfer(params: StyleTransferParams): Promise<StyleTransferResult> {
	try {
		const response = await fetch('/api/style-transfer', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params),
		})

		if (!response.ok) {
			const err = await response.json().catch(() => ({ error: response.statusText }))
			throw new Error((err as { error?: string }).error ?? 'Style transfer failed')
		}

		return (await response.json()) as StyleTransferResult
	} catch (e) {
		throw new Error(`Backend unavailable: ${e instanceof Error ? e.message : e}`)
	}
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
export async function apiGenerateText(params: GenerateTextParams): Promise<GenerateTextResult> {
	// Coerce input to string so the worker always receives a string
	const coercedParams = {
		...params,
		input: params.input != null ? String(params.input) : undefined,
	}
	try {
		const response = await fetch('/api/generate-text', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(coercedParams),
		})

		if (!response.ok) {
			const err = await response.json().catch(() => ({ error: response.statusText }))
			throw new Error((err as { error?: string }).error ?? 'Text generation failed')
		}

		return (await response.json()) as GenerateTextResult
	} catch (e) {
		throw new Error(`Backend unavailable: ${e instanceof Error ? e.message : e}`)
	}
}

