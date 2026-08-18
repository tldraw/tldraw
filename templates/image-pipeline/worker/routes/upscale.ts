import { error, IRequest, json } from 'itty-router'
import { getUpscaleProvider } from '../providers'

interface UpscaleRequest {
	imageUrl: string
	/** 2 or 4 */
	scale: number
	method: string
}

export async function handleUpscale(request: IRequest, env: Env) {
	const body = (await request.json()) as UpscaleRequest

	if (!body.imageUrl) return error(400, 'imageUrl is required')

	const provider = getUpscaleProvider(body.method)
	if (!provider.upscale) {
		return error(400, `Provider "${provider.name}" does not support upscaling`)
	}

	return json(await provider.upscale(body, env))
}
