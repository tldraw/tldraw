import { IRequest } from 'itty-router'

interface UpscaleRequest {
	/** URL of the image to upscale */
	imageUrl: string
	/** Scale factor (2 or 4) */
	scale: number
	/** Upscale method */
	method: string
}

/**
 * POST /api/upscale
 *
 * Upscales an image using an AI upscaler. Falls back to a placeholder
 * if no API key is configured.
 */
export async function handleUpscale(request: IRequest, env: Env) {
	const body = (await request.json()) as UpscaleRequest

	if (!body.imageUrl) {
		return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	try {
		let result: { imageUrl: string }

		if (env.FAL_API_KEY && body.method === 'ai_enhanced') {
			result = await upscaleWithFal(body, env)
		} else if (env.STABILITY_API_KEY) {
			result = await upscaleWithStability(body, env)
		} else {
			result = upscalePlaceholder(body)
		}

		return new Response(JSON.stringify(result), {
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (e: any) {
		console.error('Upscale error:', e)
		return new Response(JSON.stringify({ error: e.message ?? 'Upscale failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

async function upscaleWithFal(body: UpscaleRequest, env: Env): Promise<{ imageUrl: string }> {
	const response = await fetch('https://fal.run/fal-ai/creative-upscaler', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Key ${env.FAL_API_KEY}`,
		},
		body: JSON.stringify({
			image_url: body.imageUrl,
			scale: body.scale,
		}),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`fal.ai upscale error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as { image: { url: string } }
	return { imageUrl: data.image.url }
}

async function upscaleWithStability(body: UpscaleRequest, env: Env): Promise<{ imageUrl: string }> {
	const response = await fetch(
		'https://api.stability.ai/v1/generation/esrgan-v1-x2plus/image-to-image/upscale',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.STABILITY_API_KEY}`,
			},
			body: JSON.stringify({
				image: body.imageUrl,
				width: 1024 * body.scale,
			}),
		}
	)

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Stability AI upscale error ${response.status}: ${text}`)
	}

	const data = (await response.json()) as {
		artifacts: Array<{ base64: string }>
	}
	return {
		imageUrl: `data:image/png;base64,${data.artifacts[0].base64}`,
	}
}

function upscalePlaceholder(body: UpscaleRequest): { imageUrl: string } {
	const size = 512 * body.scale
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
		<defs><linearGradient id="ug" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="hsl(200,60%,50%)"/>
			<stop offset="100%" stop-color="hsl(200,60%,70%)"/>
		</linearGradient></defs>
		<rect width="${size}" height="${size}" fill="url(#ug)"/>
		<text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="24">${body.scale}x ${body.method}</text>
		<text x="${size / 2}" y="${size / 2 + 30}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="14">${size}×${size} · placeholder</text>
	</svg>`
	return {
		imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
	}
}
