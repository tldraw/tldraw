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
		// If the worker isn't running (e.g. plain `vite dev`), fall back to
		// a local placeholder so the template still works without a backend.
		console.warn('Backend unavailable, using placeholder:', e)
		return generateLocalPlaceholder(params)
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
		console.warn('Backend unavailable, using placeholder:', e)
		return upscaleLocalPlaceholder(params)
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
		console.warn('Backend unavailable, using placeholder:', e)
		return ipAdapterLocalPlaceholder(params)
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
		console.warn('Backend unavailable, using placeholder:', e)
		return styleTransferLocalPlaceholder(params)
	}
}

// ---------------------------------------------------------------------------
// Local placeholders (used when no backend is available)
// ---------------------------------------------------------------------------

function generateLocalPlaceholder(params: GenerateParams): GenerateResult {
	const seed = params.seed ?? Math.floor(Math.random() * 100000)
	const hue = (seed * 137.508) % 360
	const prompt = params.prompt.slice(0, 40)

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
		<defs>
			<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="hsl(${hue}, 50%, 35%)"/>
				<stop offset="100%" stop-color="hsl(${(hue + 60) % 360}, 40%, 50%)"/>
			</linearGradient>
		</defs>
		<rect width="1024" height="1024" fill="url(#bg)"/>
		<text x="512" y="480" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="sans-serif" font-size="24" font-weight="bold">${prompt}</text>
		<text x="512" y="520" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="16">seed: ${seed} · steps: ${params.steps ?? 20}</text>
		<text x="512" y="560" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-family="sans-serif" font-size="14">local placeholder</text>
	</svg>`

	return {
		imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
		seed,
	}
}

function upscaleLocalPlaceholder(params: UpscaleParams): UpscaleResult {
	const size = 512 * params.scale
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
		<defs><linearGradient id="ug" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="hsl(200,60%,50%)"/>
			<stop offset="100%" stop-color="hsl(200,60%,70%)"/>
		</linearGradient></defs>
		<rect width="${size}" height="${size}" fill="url(#ug)"/>
		<text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="24">${params.scale}x ${params.method}</text>
		<text x="${size / 2}" y="${size / 2 + 30}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="14">${size}×${size} · local placeholder</text>
	</svg>`
	return {
		imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
	}
}

function ipAdapterLocalPlaceholder(params: IPAdapterParams): IPAdapterResult {
	const hue = Math.floor(Math.random() * 360)
	const prompt = (params.prompt || 'IP-Adapter').slice(0, 30)
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
		<defs><linearGradient id="ip" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="hsl(${hue},50%,40%)"/>
			<stop offset="100%" stop-color="hsl(${(hue + 80) % 360},45%,55%)"/>
		</linearGradient></defs>
		<rect width="1024" height="1024" fill="url(#ip)"/>
		<text x="512" y="490" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="22">${prompt}</text>
		<text x="512" y="530" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="14">IP-Adapter · scale ${params.scale} · local placeholder</text>
	</svg>`
	return {
		imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
	}
}

function styleTransferLocalPlaceholder(params: StyleTransferParams): StyleTransferResult {
	const hue = Math.floor(Math.random() * 360)
	const model = params.model || 'fast'
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
		<defs><linearGradient id="st" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="hsl(${hue},55%,35%)"/>
			<stop offset="100%" stop-color="hsl(${(hue + 120) % 360},50%,50%)"/>
		</linearGradient></defs>
		<rect width="1024" height="1024" fill="url(#st)"/>
		<text x="512" y="490" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="22">Style Transfer</text>
		<text x="512" y="530" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="14">${model} · strength ${params.strength} · local placeholder</text>
	</svg>`
	return {
		imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
	}
}
