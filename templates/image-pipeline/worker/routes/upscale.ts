import { error, IRequest, json } from 'itty-router'
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

	if (!body.imageUrl) return error(400, 'imageUrl is required')

	const provider = getUpscaleProvider(body.method)
	if (!provider.upscale) {
		return error(400, `Provider "${provider.name}" does not support upscaling`)
	}

	return json(await provider.upscale(body, env))
}
