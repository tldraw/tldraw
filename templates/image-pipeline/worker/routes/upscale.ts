import { IRequest } from 'itty-router'
import { jsonResponse } from '../jsonResponse'
import { getUpscaleProvider } from '../providers'
import type { UpscaleParams } from '../providers'

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

	if (!body.imageUrl) return jsonResponse({ error: 'imageUrl is required' }, 400)

	try {
		const provider = getUpscaleProvider(body.method)
		const params: UpscaleParams = {
			imageUrl: body.imageUrl,
			scale: body.scale,
			method: body.method,
		}

		if (!provider.upscale) {
			return jsonResponse({ error: `Provider "${provider.name}" does not support upscaling` }, 400)
		}

		return jsonResponse(await provider.upscale(params, env))
	} catch (e: any) {
		console.error('Upscale error:', e)
		return jsonResponse({ error: e.message ?? 'Upscale failed' }, 500)
	}
}
