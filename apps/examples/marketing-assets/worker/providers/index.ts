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

/**
 * The text-planning providers, keyed by the name used in PLAN_PROVIDER. The app
 * stays agent-agnostic: register another vendor here and select it by env var,
 * with no change to the routes or the client.
 */
const PLAN_PROVIDERS: Record<string, PlanProvider> = {
	anthropic,
}

/**
 * Resolve the text-planning provider named by `env.PLAN_PROVIDER`, defaulting to
 * Claude (anthropic). The specific model is read from `env.PLAN_MODEL` inside the
 * provider, so the app stays configurable through env alone.
 */
export function getPlanProvider(env: Env): PlanProvider {
	const name = env.PLAN_PROVIDER || 'anthropic'
	const provider = PLAN_PROVIDERS[name]
	if (!provider) {
		const known = Object.keys(PLAN_PROVIDERS).join(', ')
		throw new Error(`Unknown PLAN_PROVIDER "${name}". Registered providers: ${known}`)
	}
	return provider
}
