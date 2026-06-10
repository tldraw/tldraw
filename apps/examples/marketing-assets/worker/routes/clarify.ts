import { IRequest } from 'itty-router'
import { getPlanProvider } from '../providers'
import type { ClarifyParams } from '../providers'

/**
 * POST /api/clarify
 *
 * Given the brief, brand, and chosen format, returns a few clarifying questions
 * to sharpen the campaign before the first batch is generated. No image needed.
 *
 * Returns: { questions: string[] }
 */
export async function handleClarify(request: IRequest, env: Env) {
	const body = (await request.json()) as Partial<ClarifyParams>

	try {
		const provider = getPlanProvider(env)
		const params: ClarifyParams = {
			prompt: body.prompt ?? '',
			brandText: body.brandText ?? '',
			outputType: body.outputType ?? {
				id: 'ig-square',
				label: 'Instagram square',
				width: 1080,
				height: 1080,
			},
		}

		const result = await provider.clarify(params, env)
		return json(result)
	} catch (e: any) {
		console.error('Clarify error:', e)
		return json({ error: e.message ?? 'Could not get questions' }, 500)
	}
}

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}
