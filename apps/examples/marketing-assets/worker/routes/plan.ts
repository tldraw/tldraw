import { IRequest } from 'itty-router'
import { getPlanProvider } from '../providers'
import type { PlanParams } from '../providers'

/**
 * POST /api/plan
 *
 * Plans the text of an asset. On `create`, lays out text over a fresh background.
 * On `revise`, reads the annotated composite and returns the updated text layers
 * plus any background edits to hand to the image model.
 *
 * Returns: { textLayers: TextLayer[], backgroundInstructions: string[] }
 */
export async function handlePlan(request: IRequest, env: Env) {
	const body = (await request.json()) as Partial<PlanParams>

	if (!body.image) {
		return json({ error: 'image is required' }, 400)
	}

	try {
		const provider = getPlanProvider(env)
		const params: PlanParams = {
			mode: body.mode === 'revise' ? 'revise' : 'create',
			prompt: body.prompt ?? '',
			brandText: body.brandText ?? '',
			outputType: body.outputType ?? {
				id: 'ig-square',
				label: 'Instagram square',
				width: 1080,
				height: 1080,
			},
			image: body.image,
			currentLayers: body.currentLayers,
			annotations: body.annotations,
			captionAngle: body.captionAngle,
		}

		const result = await provider.plan(params, env)
		return json(result)
	} catch (e: any) {
		console.error('Plan error:', e)
		return json({ error: e.message ?? 'Planning failed' }, 500)
	}
}

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}
