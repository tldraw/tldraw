import { anthropic } from './anthropic'
import { gemini } from './gemini'
import type { ImageProvider, PlanProvider } from './types'

export type {
	ClarifyParams,
	ClarifyResult,
	GenerateParams,
	GenerateResult,
	ImageProvider,
	OutputType,
	PlanParams,
	PlanProvider,
	PlanResult,
	TextLayer,
} from './types'

/**
 * Resolve the image (background) provider. The app ships with Gemini; add a case
 * here to wire up another vendor without touching the routes or the client.
 */
export function getImageProvider(_name?: string): ImageProvider {
	return gemini
}

/** Resolve the text-planning provider. Ships with Claude. */
export function getPlanProvider(_name?: string): PlanProvider {
	return anthropic
}
