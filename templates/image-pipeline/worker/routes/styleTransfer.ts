import { IRequest } from 'itty-router'
import { resolveImage } from '../providers/types'

interface StyleTransferRequest {
	styleImageUrl: string
	contentImageUrl?: string
	prompt?: string
	model: string
	strength: number
}

/**
 * POST /api/style-transfer
 *
 * Transfers the style of one image onto another (or generates a new image
 * in that style) using fofr/style-transfer on Replicate.
 * Falls back to a placeholder if no API key.
 */
export async function handleStyleTransfer(request: IRequest, env: Env) {
	const body = (await request.json()) as StyleTransferRequest

	if (!body.styleImageUrl) {
		return new Response(JSON.stringify({ error: 'styleImageUrl is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const apiKey = env.REPLICATE_API_TOKEN
	if (!apiKey) {
		return new Response(JSON.stringify(styleTransferPlaceholder(body)), {
			headers: { 'Content-Type': 'application/json' },
		})
	}

	try {
		const { dataUrl: styleDataUrl } = await resolveImage(body.styleImageUrl, env)

		const input: Record<string, unknown> = {
			style_image: styleDataUrl,
			prompt: body.prompt || '',
			style_strength: body.strength ?? 0.5,
		}

		if (body.contentImageUrl) {
			const { dataUrl: contentDataUrl } = await resolveImage(body.contentImageUrl, env)
			input.structure_image = contentDataUrl
		}

		// Map model variant to the Replicate model parameter
		const modelMap: Record<string, string> = {
			fast: 'fast',
			'high-quality': 'high-quality',
			realistic: 'realistic',
			cinematic: 'cinematic',
			animated: 'animated',
		}
		input.model = modelMap[body.model] ?? 'fast'

		const prediction = await fetch('https://api.replicate.com/v1/predictions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				Prefer: 'wait',
			},
			body: JSON.stringify({
				version: 'f1023890703bc0a5a3a2c21b5e498833be5f6ef6e70e9daf6b9b3a4fd8309cf0',
				input,
			}),
		})

		if (!prediction.ok) {
			const err = await prediction.text()
			throw new Error(`Replicate error: ${prediction.status} ${err}`)
		}

		const result = (await prediction.json()) as { output?: string[] | string }
		const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
		if (!outputUrl) throw new Error('No output from style transfer')

		// Persist to R2 if available
		let imageUrl = outputUrl
		if (env.IMAGE_BUCKET) {
			const imageRes = await fetch(outputUrl)
			const imageData = await imageRes.arrayBuffer()
			const id = crypto.randomUUID()
			await env.IMAGE_BUCKET.put(id, imageData, {
				httpMetadata: { contentType: imageRes.headers.get('content-type') ?? 'image/png' },
			})
			imageUrl = `/api/images/${id}`
		}

		return new Response(JSON.stringify({ imageUrl }), {
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (e: any) {
		console.error('Style transfer error:', e)
		return new Response(JSON.stringify({ error: e.message ?? 'Style transfer failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

function styleTransferPlaceholder(params: StyleTransferRequest) {
	const hue = Math.floor(Math.random() * 360)
	const model = params.model || 'fast'
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
		<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="hsl(${hue},55%,35%)"/>
			<stop offset="100%" stop-color="hsl(${(hue + 120) % 360},50%,50%)"/>
		</linearGradient></defs>
		<rect width="1024" height="1024" fill="url(#bg)"/>
		<text x="512" y="490" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="22">Style Transfer</text>
		<text x="512" y="530" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="14">${model} · strength ${params.strength} · placeholder</text>
	</svg>`
	return { imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}` }
}
