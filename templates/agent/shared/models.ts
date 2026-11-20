export type AgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS
export type AgentModelProvider = 'openai' | 'anthropic' | 'google'

/**
 * Thinking mode passed to the Anthropic provider. Models without adaptive thinking, such as Haiku
 * 4.5, take a token budget instead.
 */
export type AnthropicThinking = 'adaptive' | 'disabled' | { budgetTokens: number }

/** Effort level passed to the Anthropic provider (Opus 4.6+/Sonnet 4.6+; not supported on Haiku 4.5). */
export type AnthropicEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** Reasoning effort passed to the OpenAI provider. */
export type OpenAIReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** Thinking level passed to the Google provider. */
export type GeminiThinkingLevel = 'low' | 'medium' | 'high'

interface BaseAgentModelDefinition {
	name: AgentModelName
	/** The provider's own model id. */
	id: string
	/** The model's id on OpenRouter, used when the worker has an `OPENROUTER_API_KEY`. */
	openRouterId: string

	/**
	 * Whether the model accepts a `temperature` sampling parameter.
	 * Opus 4.7+ and Sonnet 5 removed `temperature`/`top_p`/`top_k` (sending them is a 400).
	 */
	supportsTemperature: boolean
}

export interface AnthropicModelDefinition extends BaseAgentModelDefinition {
	provider: 'anthropic'
	thinking: AnthropicThinking
	/** Effort level; omit for models that don't support it (e.g. Haiku 4.5). */
	effort?: AnthropicEffort
}

export interface GoogleModelDefinition extends BaseAgentModelDefinition {
	provider: 'google'
	thinkingLevel: GeminiThinkingLevel
}

export interface OpenAIModelDefinition extends BaseAgentModelDefinition {
	provider: 'openai'
	/** Reasoning effort; omit to use the model's default. */
	reasoningEffort?: OpenAIReasoningEffort
}

export type AgentModelDefinition =
	| AnthropicModelDefinition
	| GoogleModelDefinition
	| OpenAIModelDefinition

export const AGENT_MODEL_DEFINITIONS = {
	'gemini-4-hydrogen': {
		name: 'gemini-4-hydrogen',
		id: 'gemini-4-hydrogen',
		openRouterId: 'google/gemini-4-hydrogen',
		provider: 'google',
		supportsTemperature: false,
		thinkingLevel: 'low',
	},
} as const

export const DEFAULT_MODEL_NAME: AgentModelName = 'gemini-4-hydrogen'

/**
 * Check if a string is a valid AgentModelName.
 */
export function isValidModelName(value: string | undefined): value is AgentModelName {
	return !!value && Object.hasOwn(AGENT_MODEL_DEFINITIONS, value)
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
