export type AgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS
export type AgentModelProvider = 'openai' | 'anthropic' | 'google'

/** Adaptive-thinking mode passed to the Anthropic provider. */
export type AnthropicThinking = 'adaptive' | 'disabled'

/** Effort level passed to the Anthropic provider (Opus 4.6+/Sonnet 4.6+; not supported on Haiku 4.5). */
export type AnthropicEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** Reasoning effort passed to the OpenAI provider. */
export type OpenAIReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** Thinking level passed to the Google provider. */
export type GeminiThinkingLevel = 'low' | 'medium' | 'high'

interface BaseAgentModelDefinition {
	name: AgentModelName
	id: string

	/**
	 * Whether the model accepts a prefilled assistant turn to force the JSON start.
	 * Opus 4.6+ and Sonnet 4.6+ reject last-assistant-turn prefills (400).
	 */
	supportsPrefill: boolean

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
	reasoningEffort: OpenAIReasoningEffort
}

export type AgentModelDefinition =
	| AnthropicModelDefinition
	| GoogleModelDefinition
	| OpenAIModelDefinition

export const AGENT_MODEL_DEFINITIONS = {
	// Anthropic models
	'claude-opus-5': {
		name: 'claude-opus-5',
		id: 'claude-opus-5',
		provider: 'anthropic',
		supportsPrefill: false,
		supportsTemperature: false,
		thinking: 'adaptive',
		effort: 'medium',
	},

	'claude-sonnet-5': {
		name: 'claude-sonnet-5',
		id: 'claude-sonnet-5',
		provider: 'anthropic',
		supportsPrefill: false,
		supportsTemperature: false,
		thinking: 'adaptive',
		effort: 'low',
	},

	'claude-haiku-4-5': {
		name: 'claude-haiku-4-5',
		id: 'claude-haiku-4-5',
		provider: 'anthropic',
		supportsPrefill: true,
		supportsTemperature: true,
		thinking: 'disabled',
	},

	// Google models
	'gemini-3.8-flash': {
		name: 'gemini-3.8-flash',
		id: 'gemini-3.8-flash',
		provider: 'google',
		supportsPrefill: false,
		supportsTemperature: false,
		thinkingLevel: 'low',
	},

	// OpenAI models
	'gpt-5.6-sol': {
		name: 'gpt-5.6-sol',
		id: 'gpt-5.6-sol',
		provider: 'openai',
		supportsPrefill: false,
		supportsTemperature: false,
		reasoningEffort: 'medium',
	},

	'gpt-5.6-terra': {
		name: 'gpt-5.6-terra',
		id: 'gpt-5.6-terra',
		provider: 'openai',
		supportsPrefill: false,
		supportsTemperature: false,
		reasoningEffort: 'high',
	},

	'gpt-5.6-luna': {
		name: 'gpt-5.6-luna',
		id: 'gpt-5.6-luna',
		provider: 'openai',
		supportsPrefill: false,
		supportsTemperature: false,
		reasoningEffort: 'max',
	},
} as const

export const DEFAULT_MODEL_NAME: AgentModelName = 'claude-sonnet-5'

/**
 * Check if a string is a valid AgentModelName.
 */
export function isValidModelName(value: string | undefined): value is AgentModelName {
	return !!value && value in AGENT_MODEL_DEFINITIONS
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
