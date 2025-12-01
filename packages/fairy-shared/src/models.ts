// export const DEFAULT_MODEL_NAME =
// 	(process.env.FAIRY_MODEL as AgentModelName | undefined) ?? 'claude-sonnet-4-5' //'gemini-3-pro-preview'

export const DEFAULT_MODEL_NAME: AgentModelName = 'claude-sonnet-4-5'
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

	'claude-sonnet-4-5': {
		name: 'claude-sonnet-4-5',
		id: 'claude-sonnet-4-5',
		provider: 'anthropic',
	},

	'claude-haiku-4-5': {
		name: 'claude-haiku-4-5',
		id: 'claude-haiku-4-5',
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

export interface ModelPricingInfo {
	uncachedInputPrice: number
	cacheReadInputPrice: number | null // null means caching not supported
	outputPrice: number
	cacheWriteInputPrice: number | null // null means caching not supported
}

/**
 * Get pricing for a specific model based on prompt token count.
 * Some models have tiered pricing based on prompt size.
 * @param modelName - The model name
 * @param inputTokens - The number of prompt tokens for this request
 * @returns Pricing per million tokens: { uncachedInputPrice, cacheReadInputPrice, cacheWriteInputPrice, outputPrice }
 */
export function getModelPricingInfo(
	modelName: AgentModelName,
	inputTokens: number
): ModelPricingInfo {
	switch (modelName) {
		case 'gemini-3-pro-preview':
			if (inputTokens <= TIER_THRESHOLD) {
				return {
					uncachedInputPrice: 2,
					cacheReadInputPrice: 0.2,
					cacheWriteInputPrice: null,
					outputPrice: 12,
				}
			} else {
				return {
					uncachedInputPrice: 4,
					cacheReadInputPrice: 0.4,
					cacheWriteInputPrice: null,
					outputPrice: 18,
				}
			}
		case 'claude-sonnet-4-5':
			if (inputTokens <= TIER_THRESHOLD) {
				return {
					uncachedInputPrice: 3,
					cacheReadInputPrice: 0.3,
					cacheWriteInputPrice: 3.75,
					outputPrice: 15,
				}
			} else {
				return {
					uncachedInputPrice: 6,
					cacheReadInputPrice: 0.6,
					cacheWriteInputPrice: 7.5,
					outputPrice: 22.5,
				}
			}
		case 'claude-haiku-4-5':
			return {
				uncachedInputPrice: 1,
				cacheReadInputPrice: 0.1,
				cacheWriteInputPrice: 1.25,
				outputPrice: 5,
			}
		case 'gpt-5.1':
			return {
				uncachedInputPrice: 1.25,
				cacheReadInputPrice: 0.125,
				cacheWriteInputPrice: null,
				outputPrice: 10,
			}
	}
}
