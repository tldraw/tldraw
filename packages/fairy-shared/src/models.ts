export const DEFAULT_MODEL_NAME =
	(process.env.FAIRY_MODEL as AgentModelName | undefined) ?? 'claude-4.5-sonnet' // 'gemini-3-pro-preview'

export type AgentModelProvider = 'openai' | 'anthropic' | 'google'

export interface AgentModelDefinition {
	name: AgentModelName
	id: string
	provider: AgentModelProvider

	// Overrides the default thinking behavior for that provider
	thinking?: boolean
}

export const AGENT_MODEL_DEFINITIONS = {
	'gemini-3-pro-preview': {
		name: 'gemini-3-pro-preview',
		id: 'gemini-3-pro-preview',
		provider: 'google',
	},

	'claude-4.5-sonnet': {
		name: 'claude-4.5-sonnet',
		id: 'claude-sonnet-4-5',
		provider: 'anthropic',
	},

	'gpt-5.1': {
		name: 'gpt-5.1',
		id: 'gpt-5.1',
		provider: 'openai',
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
		case 'gemini-3-pro-preview':
			if (promptTokens <= TIER_THRESHOLD) {
				return { inputPrice: 2, cachedInputPrice: 0.2, outputPrice: 12 }
			} else {
				return { inputPrice: 4, cachedInputPrice: 0.4, outputPrice: 18 }
			}
		case 'claude-4.5-sonnet':
			if (promptTokens <= TIER_THRESHOLD) {
				return { inputPrice: 3, cachedInputPrice: null, outputPrice: 15 }
			} else {
				return { inputPrice: 6, cachedInputPrice: null, outputPrice: 22.5 }
			}
		case 'gpt-5.1':
			return { inputPrice: 1.25, cachedInputPrice: 0.125, outputPrice: 10 }
	}
}
