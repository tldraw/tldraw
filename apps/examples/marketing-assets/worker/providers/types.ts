import type {
	ClarifyRequest,
	ClarifyResult,
	GenerateRequest,
	GenerateResult,
	PlanRequest,
	PlanResult,
} from '../../shared/apiTypes'

// The request/result shapes are the wire contract shared with the client — defined
// once in shared/apiTypes.ts. Providers call the requests "params" because to them
// they are call parameters, not HTTP requests.
export type {
	ClarifyResult,
	GenerateResult,
	OutputType,
	PlanResult,
	TextLayer,
} from '../../shared/apiTypes'
export type ClarifyParams = ClarifyRequest
export type GenerateParams = GenerateRequest
export type PlanParams = PlanRequest

export interface ImageProvider {
	name: string
	generate(params: GenerateParams, env: Env): Promise<GenerateResult>
}

export interface PlanProvider {
	name: string
	plan(params: PlanParams, env: Env): Promise<PlanResult>
	clarify(params: ClarifyParams, env: Env): Promise<ClarifyResult>
}

/** Split a `data:` URL into its mime type and base64 payload. */
export function parseDataUrl(url: string): { mimeType: string; data: string } {
	const match = url.match(/^data:([^;]+);base64,(.*)$/)
	if (!match) {
		throw new Error('Expected a base64 data URL')
	}
	return { mimeType: match[1], data: match[2] }
}
