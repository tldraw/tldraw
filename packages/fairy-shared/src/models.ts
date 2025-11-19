export const DEFAULT_MODEL_NAME = 'gemini-3-pro-preview' as const

export type AgentModelProvider = 'openai' | 'anthropic' | 'google'

export interface AgentModelDefinition {
	name: AgentModelName
	id: string
	provider: AgentModelProvider
	displayName?: string

	// Overrides the default thinking behavior for that provider
	thinking?: boolean
}

export const AGENT_MODEL_DEFINITIONS = {
	'claude-4.5-sonnet': {
		name: 'claude-4.5-sonnet',
		id: 'claude-sonnet-4-5',
		provider: 'anthropic',
	},

	'claude-4.5-haiku': {
		name: 'claude-4.5-haiku',
		id: 'claude-haiku-4-5',
		provider: 'anthropic',
		displayName: '(not great, breaks schema) claude-4.5-haiku',
	},

	'gemini-3-pro-preview': {
		name: 'gemini-3-pro-preview',
		id: 'gemini-3-pro-preview',
		provider: 'google',
		displayName: 'gemini-3-pro',
	},

	'gemini-2.5-pro': {
		name: 'gemini-2.5-pro',
		id: 'gemini-2.5-pro',
		provider: 'google',
		thinking: true,
		displayName: "(doesn't work yet) gemini-2.5-pro",
	},

	'gemini-2.5-flash': {
		name: 'gemini-2.5-flash',
		id: 'gemini-2.5-flash',
		provider: 'google',
	},

	'gpt-5.1': {
		name: 'gpt-5.1',
		id: 'gpt-5.1',
		provider: 'openai',
	},

	'gpt-5-mini': {
		name: 'gpt-5-mini',
		id: 'gpt-5-mini-2025-08-07',
		provider: 'openai',
		displayName: '(not great, freezes) gpt-5-mini',
	},
} as const

export type AgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS

export const TIER_THRESHOLD = 200_000

export interface ModelPricing {
	inputPrice: number
	cachedInputPrice: number | null // null means caching not supported
	outputPrice: number
}

/**
 * Get pricing for a specific model based on prompt token count.
 * Some models have tiered pricing based on prompt size.
 * @param modelName - The model name
 * @param promptTokens - The number of prompt tokens for this request
 * @returns Pricing per million tokens: { inputPrice, cachedInputPrice, outputPrice }
 */
export function getModelPricing(modelName: AgentModelName, promptTokens: number): ModelPricing {
	switch (modelName) {
		case 'gpt-5.1':
			return { inputPrice: 1.25, cachedInputPrice: 0.125, outputPrice: 10 }

		case 'gpt-5-mini':
			return { inputPrice: 0.25, cachedInputPrice: 0.025, outputPrice: 2 }

		case 'gemini-3-pro-preview':
			if (promptTokens <= TIER_THRESHOLD) {
				return { inputPrice: 2, cachedInputPrice: 0.2, outputPrice: 12 }
			} else {
				return { inputPrice: 4, cachedInputPrice: 0.4, outputPrice: 18 }
			}

		case 'gemini-2.5-pro':
			// Tiered pricing based on prompt token count
			if (promptTokens <= TIER_THRESHOLD) {
				return { inputPrice: 1.25, cachedInputPrice: null, outputPrice: 10 }
			} else {
				return { inputPrice: 2.5, cachedInputPrice: null, outputPrice: 15 }
			}

		case 'gemini-2.5-flash':
			return { inputPrice: 0.3, cachedInputPrice: null, outputPrice: 2.5 }

		case 'claude-4.5-haiku':
			return { inputPrice: 1, cachedInputPrice: null, outputPrice: 5 }

		case 'claude-4.5-sonnet':
		default:
			// Claude 4.5 Sonnet tiered pricing
			if (promptTokens <= TIER_THRESHOLD) {
				return { inputPrice: 3, cachedInputPrice: null, outputPrice: 15 }
			} else {
				return { inputPrice: 6, cachedInputPrice: null, outputPrice: 22.5 }
			}
	}
}
