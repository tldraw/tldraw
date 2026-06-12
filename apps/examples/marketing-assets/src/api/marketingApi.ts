import type {
	ClarifyRequest,
	ClarifyResult,
	GenerateRequest,
	GenerateResult,
	PlanRequest,
	PlanResult,
} from '../../shared/apiTypes'

/**
 * Frontend API client for the Cloudflare Worker backend. The request and result
 * shapes are the shared wire contract in shared/apiTypes.ts, imported by both this
 * client and the worker's providers.
 */

export type {
	ClarifyRequest,
	ClarifyResult,
	GenerateRequest,
	GenerateResult,
	OutputType,
	PlanRequest,
	PlanResult,
	TextLayer,
} from '../../shared/apiTypes'

/** Render or edit the text-free background image. */
export async function apiGenerate(params: GenerateRequest): Promise<GenerateResult> {
	return post('/api/generate', params, 'Generation failed')
}

/** Plan the text layers (and, on revise, any background edits). */
export async function apiPlan(params: PlanRequest): Promise<PlanResult> {
	return post('/api/plan', params, 'Planning failed')
}

/**
 * Ask the planner for a few clarifying questions before the first batch, given
 * the brief, the brand, and the chosen format. Returns an empty list if the brief
 * is already clear.
 */
export async function apiClarify(params: ClarifyRequest): Promise<ClarifyResult> {
	return post('/api/clarify', params, 'Could not get questions')
}

async function post<Result>(path: string, params: unknown, fallbackError: string): Promise<Result> {
	const response = await fetch(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(params),
	})
	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }))
		throw new Error((err as { error?: string }).error ?? fallbackError)
	}
	return (await response.json()) as Result
}
