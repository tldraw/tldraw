export interface GenerateParams {
	modelId: string
	prompt: string
	negativePrompt?: string
	steps: number
	cfgScale: number
	seed: number | null
	controlNetMode?: string
	controlNetStrength?: number
	referenceImageUrl?: string
}

export interface GenerateResult {
	imageUrl: string
	seed: number
}

export interface UpscaleParams {
	imageUrl: string
	scale: number
	method: string
}

export interface UpscaleResult {
	imageUrl: string
}

export interface ImageProvider {
	name: string
	generate(params: GenerateParams, env: Env): Promise<GenerateResult>
	upscale?(params: UpscaleParams, env: Env): Promise<UpscaleResult>
}

/**
 * Resolve an image URL (data URL, R2 path, or external URL) into a Blob
 * and a data URL that external APIs can consume.
 */
export async function resolveImage(
	url: string,
	env: Env
): Promise<{ blob: Blob; dataUrl: string }> {
	if (url.startsWith('data:')) {
		const [header, data] = url.split(',')
		const mime = header.match(/data:([^;]+)/)?.[1] ?? 'image/png'
		if (header.includes('base64')) {
			return { blob: new Blob([base64ToBytes(data)], { type: mime }), dataUrl: url }
		}
		return toResolved(new TextEncoder().encode(decodeURIComponent(data)), mime)
	}

	if (url.startsWith('/api/images/') && env.IMAGE_BUCKET) {
		const imageId = url.slice('/api/images/'.length)
		const object = await env.IMAGE_BUCKET.get(imageId)
		if (!object) throw new Error(`Image not found in R2: ${imageId}`)
		return toResolved(await object.arrayBuffer(), object.httpMetadata?.contentType ?? 'image/png')
	}

	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
	return toResolved(await res.arrayBuffer(), res.headers.get('content-type') ?? 'image/png')
}

/** Store the image at `url` in R2 and return its `/api/images/:id` path. */
export async function persistImage(url: string, env: Env): Promise<string> {
	const res = await fetch(url)
	const id = crypto.randomUUID()
	await env.IMAGE_BUCKET.put(id, await res.arrayBuffer(), {
		httpMetadata: { contentType: res.headers.get('content-type') ?? 'image/png' },
	})
	return `/api/images/${id}`
}

/** Gradient SVG data URL used in place of a real result when no API token is configured. */
export function placeholderImage(title: string, subtitle: string): string {
	const hue = Math.floor(Math.random() * 360)
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
		<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="hsl(${hue},50%,40%)"/>
			<stop offset="100%" stop-color="hsl(${(hue + 100) % 360},45%,55%)"/>
		</linearGradient></defs>
		<rect width="1024" height="1024" fill="url(#bg)"/>
		<text x="512" y="490" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="22">${title}</text>
		<text x="512" y="530" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="14">${subtitle}</text>
	</svg>`
	return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function toResolved(buf: ArrayBuffer | Uint8Array<ArrayBuffer>, mime: string) {
	return {
		blob: new Blob([buf], { type: mime }),
		dataUrl: `data:${mime};base64,${bytesToBase64(buf)}`,
	}
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
	const binary = atob(b64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}

function bytesToBase64(buf: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
	const chunks: string[] = []
	const chunkSize = 8192
	for (let i = 0; i < bytes.length; i += chunkSize) {
		chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)))
	}
	return btoa(chunks.join(''))
}
