import { IRequest } from 'itty-router'
import { resolveImage } from '../providers/types'

interface IPAdapterRequest {
	imageUrl: string
	prompt: string
	scale: number
	steps: number
}

/**
 * POST /api/ip-adapter
 *
 * Generates an image guided by a reference image and text prompt using
 * IP-Adapter SDXL on Replicate. Falls back to a placeholder if no API key.
 */
export async function handleIPAdapter(request: IRequest, env: Env) {
	const body = (await request.json()) as IPAdapterRequest

	if (!body.imageUrl) {
		return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const apiKey = env.REPLICATE_API_TOKEN
	if (!apiKey) {
		return new Response(JSON.stringify(ipAdapterPlaceholder(body)), {
			headers: { 'Content-Type': 'application/json' },
		})
	}

	try {
		const { dataUrl } = await resolveImage(body.imageUrl, env)

		const prediction = await fetch('https://api.replicate.com/v1/predictions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				Prefer: 'wait',
			},
			body: JSON.stringify({
				version: '904dc004af1dba5c9b13fc9e41635aeb2f9a177896a396ab3393f3f6493dbdd4',
				input: {
					image: dataUrl,
					prompt: body.prompt || 'best quality, high quality',
					scale: body.scale ?? 0.6,
					num_inference_steps: body.steps ?? 30,
				},
			}),
		})

		if (!prediction.ok) {
			const err = await prediction.text()
			throw new Error(`Replicate error: ${prediction.status} ${err}`)
		}

		const result = (await prediction.json()) as { output?: string[] | string }
		const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
		if (!outputUrl) throw new Error('No output from IP-Adapter')

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
		console.error('IP-Adapter error:', e)
		return new Response(JSON.stringify({ error: e.message ?? 'IP-Adapter failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

function ipAdapterPlaceholder(params: IPAdapterRequest) {
	const hue = Math.floor(Math.random() * 360)
	const prompt = (params.prompt || 'IP-Adapter').slice(0, 30)
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
		<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="hsl(${hue},50%,40%)"/>
			<stop offset="100%" stop-color="hsl(${(hue + 80) % 360},45%,55%)"/>
		</linearGradient></defs>
		<rect width="1024" height="1024" fill="url(#bg)"/>
		<text x="512" y="490" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="22">${prompt}</text>
		<text x="512" y="530" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="14">IP-Adapter · scale ${params.scale} · placeholder</text>
	</svg>`
	return { imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}` }
}
