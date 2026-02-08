import { IRequest } from 'itty-router'
import type { UpscaleParams } from '../providers'
import { getUpscaleProvider } from '../providers'

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
		const provider = getUpscaleProvider(body.method)
		const params: UpscaleParams = {
			imageUrl: body.imageUrl,
			scale: body.scale,
			method: body.method,
		}

		if (!provider.upscale) {
			return new Response(
				JSON.stringify({ error: `Provider "${provider.name}" does not support upscaling` }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}

		const result = await provider.upscale(params, env)

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
