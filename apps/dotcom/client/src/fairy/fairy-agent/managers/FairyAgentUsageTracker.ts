import {
	AgentModelName,
	AgentPrompt,
	getModelPricingInfo,
	ModelNamePart,
} from '@tldraw/fairy-shared'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

const DEFAULT_MODEL_NAME = 'claude-3-5-sonnet-20241022' as AgentModelName

/**
 * Tracks token usage and costs for a fairy agent's chat session.
 * Usage is tracked per model and tier to handle different pricing models.
 */
export class FairyAgentUsageTracker extends BaseFairyAgentManager {
	/**
	 * Cumulative token usage tracking for this chat session.
	 * Tracked per model to handle different pricing models.
	 * Each model has separate tier tracking for models with tiered pricing (≤200K vs >200K tokens).
	 */
	cumulativeUsage: {
		// Usage per model, separated by tier for models with tiered pricing
		byModel: Record<
			AgentModelName,
			{
				// Tier 1: Prompts ≤ 200K tokens (for models with tiered pricing)
				tier1: {
					promptTokens: number // Total input tokens (cached + uncached)
					cachedInputTokens: number // Cached input tokens (cheaper pricing)
					completionTokens: number
				}
				// Tier 2: Prompts > 200K tokens (for models with tiered pricing)
				tier2: {
					promptTokens: number // Total input tokens (cached + uncached)
					cachedInputTokens: number // Cached input tokens (cheaper pricing)
					completionTokens: number
				}
			}
		>
		// Total across all models and tiers
		totalTokens: number
	} = {
		byModel: {} as Record<
			AgentModelName,
			{
				tier1: { promptTokens: number; cachedInputTokens: number; completionTokens: number }
				tier2: { promptTokens: number; cachedInputTokens: number; completionTokens: number }
			}
		>,
		totalTokens: 0,
	}

	/**
	 * Creates a new usage tracker for the given fairy agent.
	 * Initializes with empty usage tracking.
	 */
	constructor(public agent: FairyAgent) {
		super(agent)
	}

	/**
	 * Reset the usage tracker to its initial state.
	 * Clears all cumulative usage data.
	 */
	reset(): void {
		this.cumulativeUsage = {
			byModel: {} as Record<
				AgentModelName,
				{
					tier1: { promptTokens: number; cachedInputTokens: number; completionTokens: number }
					tier2: { promptTokens: number; cachedInputTokens: number; completionTokens: number }
				}
			>,
			totalTokens: 0,
		}
	}

	/**
	 * Extract the model name from a prompt.
	 * @param prompt - The agent prompt
	 * @returns The model name, or DEFAULT_MODEL_NAME if not found
	 */
	getModelNameFromPrompt(prompt: AgentPrompt): AgentModelName {
		for (const part of Object.values(prompt)) {
			if (part.type === 'modelName') {
				return (part as ModelNamePart).name
			}
		}
		return DEFAULT_MODEL_NAME
	}

	/**
	 * Get the current cumulative cost for this fairy agent.
	 * Calculates costs based on model-specific pricing, accounting for cached input tokens.
	 * @returns An object with input cost, output cost, and total cost in USD.
	 */
	getCumulativeCost() {
		let totalInputCost = 0
		let totalOutputCost = 0

		// Iterate through all models and calculate costs
		for (const [modelName, usage] of Object.entries(this.cumulativeUsage.byModel)) {
			const typedModelName = modelName as AgentModelName

			// Calculate cost for tier 1 (≤ 200K tokens)
			const tier1Pricing = getModelPricingInfo(typedModelName, 200_000)
			const tier1UncachedInputTokens = usage.tier1.promptTokens - usage.tier1.cachedInputTokens
			const tier1UncachedInputCost =
				(tier1UncachedInputTokens / 1_000_000) * tier1Pricing.uncachedInputPrice
			const tier1CachedInputCost =
				tier1Pricing.cacheReadInputPrice !== null
					? (usage.tier1.cachedInputTokens / 1_000_000) * tier1Pricing.cacheReadInputPrice
					: 0
			const tier1InputCost = tier1UncachedInputCost + tier1CachedInputCost
			const tier1OutputCost = (usage.tier1.completionTokens / 1_000_000) * tier1Pricing.outputPrice

			// Calculate cost for tier 2 (> 200K tokens)
			const tier2Pricing = getModelPricingInfo(typedModelName, 200_001)
			const tier2UncachedInputTokens = usage.tier2.promptTokens - usage.tier2.cachedInputTokens
			const tier2UncachedInputCost =
				(tier2UncachedInputTokens / 1_000_000) * tier2Pricing.uncachedInputPrice
			const tier2CachedInputCost =
				tier2Pricing.cacheReadInputPrice !== null
					? (usage.tier2.cachedInputTokens / 1_000_000) * tier2Pricing.cacheReadInputPrice
					: 0
			const tier2InputCost = tier2UncachedInputCost + tier2CachedInputCost
			const tier2OutputCost = (usage.tier2.completionTokens / 1_000_000) * tier2Pricing.outputPrice

			totalInputCost += tier1InputCost + tier2InputCost
			totalOutputCost += tier1OutputCost + tier2OutputCost
		}

		const totalCost = totalInputCost + totalOutputCost

		return { inputCost: totalInputCost, outputCost: totalOutputCost, totalCost }
	}
}
