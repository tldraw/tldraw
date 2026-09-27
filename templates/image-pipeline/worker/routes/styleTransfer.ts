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
 */
export async function handleStyleTransfer(request: IRequest, env: Env) {
	const apiKey = request.headers.get('x-ai-api-key')?.trim()
	if (!apiKey) return Response.json({ error: 'A Replicate API key is required.' }, { status: 401 })

	const body = (await request.json()) as StyleTransferRequest

	if (!body.styleImageUrl) {
		return new Response(JSON.stringify({ error: 'styleImageUrl is required' }), {
			status: 400,
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
