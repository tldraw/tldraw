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
 * IP-Adapter SDXL on Replicate.
 */
export async function handleIPAdapter(request: IRequest, env: Env) {
	const apiKey = request.headers.get('x-ai-api-key')?.trim()
	if (!apiKey) return Response.json({ error: 'A Replicate API key is required.' }, { status: 401 })

	const body = (await request.json()) as IPAdapterRequest

	if (!body.imageUrl) {
		return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
			status: 400,
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
