import {
	AGENT_MODEL_DEFINITIONS,
	AgentModelDefinition,
	AgentModelName,
	getModelPricingInfo,
} from '@tldraw/fairy-shared'
import { LanguageModelUsage, ProviderMetadata } from 'ai'

/**
 * Type guard to check if a string is a valid AgentModelName.
 * @param modelId - The model ID to check
 * @returns True if the modelId is a valid AgentModelName
 */
export function isAgentModelName(modelId: string): modelId is AgentModelName {
	return modelId in AGENT_MODEL_DEFINITIONS
}

/**
 * Get the full information about a model from its name.
 * @param modelName - The name of the model.
 * @returns The full definition of the model.
 */
export function getAgentModelDefinition(modelName: AgentModelName): AgentModelDefinition {
	const definition = AGENT_MODEL_DEFINITIONS[modelName]
	if (!definition) {
		throw new Error(`Model ${modelName} not found`)
	}
	return definition
}
export interface TokenUsage {
	uncachedInputTokens: number
	cacheReadInputTokens: number
	outputTokens: number
	cacheWriteInputTokens: number | null
}

/**
 * Calculate the cost of a generation based on token usage.
 * @param model - The model name
 * @param tokenUsage - The token usage breakdown
 * @returns The total cost in USD
 */
export function getGenerationCost({
	model,
	tokenUsage,
}: {
	model: AgentModelName
	tokenUsage: TokenUsage
}): number {
	const totalInputTokens = tokenUsage.uncachedInputTokens + tokenUsage.cacheReadInputTokens
	const modelPricing = getModelPricingInfo(model, totalInputTokens)

	// Calculate costs per token type (prices are per million tokens)
	const uncachedInputCost =
		(tokenUsage.uncachedInputTokens / 1_000_000) * modelPricing.uncachedInputPrice
	const cacheReadInputCost =
		modelPricing.cacheReadInputPrice !== null
			? (tokenUsage.cacheReadInputTokens / 1_000_000) * modelPricing.cacheReadInputPrice
			: 0
	const cacheWriteInputCost =
		modelPricing.cacheWriteInputPrice !== null
			? ((tokenUsage.cacheWriteInputTokens ?? 0) / 1_000_000) * modelPricing.cacheWriteInputPrice
			: 0
	const outputCost = (tokenUsage.outputTokens / 1_000_000) * modelPricing.outputPrice

	return uncachedInputCost + cacheReadInputCost + cacheWriteInputCost + outputCost
}

/**
 * Calculate the cost of a generation from usage and metadata.
 * This is a convenience function that combines convertUsageAndMetadataToTokens and getGenerationCost.
 * @param model - The model name
 * @param usage - The language model usage from the AI SDK
 * @param metadata - The provider metadata from the AI SDK
 * @returns The total cost in USD
 */
export function getGenerationCostFromUsageAndMetaData(
	model: AgentModelName,
	usage: LanguageModelUsage,
	metadata: ProviderMetadata
): number {
	const tokenUsage = convertUsageAndMetadataToTokens(model, usage, metadata)
	console.warn(`Token usage for request to ${model}:`, tokenUsage)
	return getGenerationCost({ model, tokenUsage })
}

export function convertUsageAndMetadataToTokens(
	model: AgentModelName,
	usage: LanguageModelUsage,
	metadata: ProviderMetadata
): TokenUsage {
	const modelDefinition = AGENT_MODEL_DEFINITIONS[model]
	const provider = modelDefinition.provider

	const { inputTokens = 0, outputTokens = 0, cachedInputTokens = 0 } = usage

	const tokenUsage: TokenUsage = {
		outputTokens: 0,
		cacheReadInputTokens: 0,
		uncachedInputTokens: 0,
		cacheWriteInputTokens: null,
	}

	switch (provider) {
		case 'google':
			tokenUsage.outputTokens = outputTokens
			tokenUsage.cacheReadInputTokens = cachedInputTokens
			tokenUsage.uncachedInputTokens = inputTokens - cachedInputTokens
			tokenUsage.cacheWriteInputTokens = null // we're doing implicit caching so google doesn't give us this
			break
		case 'anthropic': {
			const anthropicProviderMetadataUsage = metadata.anthropic?.usage
			if (
				!anthropicProviderMetadataUsage ||
				typeof anthropicProviderMetadataUsage !== 'object' ||
				!('cache_creation_input_tokens' in anthropicProviderMetadataUsage)
			) {
				throw new Error('Anthropic provider metadata usage not found')
			}

			tokenUsage.outputTokens = outputTokens
			tokenUsage.uncachedInputTokens = inputTokens
			tokenUsage.cacheReadInputTokens = cachedInputTokens
			tokenUsage.cacheWriteInputTokens =
				anthropicProviderMetadataUsage.cache_creation_input_tokens as number

			break
		}
		case 'openai':
			tokenUsage.outputTokens = outputTokens
			tokenUsage.cacheReadInputTokens = cachedInputTokens
			tokenUsage.uncachedInputTokens = inputTokens - cachedInputTokens
			tokenUsage.cacheWriteInputTokens = null // we're doing implicit caching so openai doesn't give us this
			break
	}
	return tokenUsage
}
