import { IRequest } from 'itty-router'
import { getImageProvider } from '../providers'
import type { GenerateParams } from '../providers'

/**
 * POST /api/generate
 *
 * Renders a marketing asset. With no `currentImage`/`instruction` this is a first
 * generation from the brief + brand + references; with both, it's a re-render that
 * edits the clean current asset per the interpreted instruction.
 *
 * Returns: { imageUrl: string } — a data URL.
 */
export async function handleGenerate(request: IRequest, env: Env) {
	const body = (await request.json()) as Partial<GenerateParams>

	if (!body.prompt && !body.instruction) {
		return json({ error: 'prompt or instruction is required' }, 400)
	}

	try {
		const provider = getImageProvider()
		const params: GenerateParams = {
			prompt: body.prompt ?? '',
			brandText: body.brandText ?? '',
			outputType: body.outputType ?? {
				id: 'square',
				label: 'Instagram square',
				width: 1080,
				height: 1080,
			},
			referenceImages: body.referenceImages ?? [],
			currentImage: body.currentImage,
			instruction: body.instruction,
		}

		const result = await provider.generate(params, env)
		return json(result)
	} catch (e: any) {
		console.error('Generate error:', e)
		return json({ error: e.message ?? 'Generation failed' }, 500)
	}
}

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}
