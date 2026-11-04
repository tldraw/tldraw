export type AgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS
export type AgentModelProvider = 'openai' | 'anthropic' | 'google'

/** How much a model reasons before it answers. */
export type AgentReasoningLevel = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface AgentModelDefinition {
	name: AgentModelName
	provider: AgentModelProvider
	/** The provider's own model id. */
	id: string
	/** The model's id on OpenRouter, used when the worker has an `OPENROUTER_API_KEY`. */
	openRouterId: string

	/**
	 * Whether the model accepts a `temperature` sampling parameter.
	 * Opus 4.7+ and Sonnet 5 removed `temperature`/`top_p`/`top_k` (sending them is a 400).
	 */
	supportsTemperature: boolean

	/** How much the model reasons. Omit to turn reasoning off. */
	reasoning?: AgentReasoningLevel
	/**
	 * The token budget for `reasoning`, for models that think with a budget instead of an effort,
	 * such as Haiku 4.5.
	 */
	thinkingBudget?: number
}

export const AGENT_MODEL_DEFINITIONS = {
	// Anthropic models
	'claude-opus-5': {
		name: 'claude-opus-5',
		id: 'claude-opus-5',
		openRouterId: 'anthropic/claude-opus-5',
		provider: 'anthropic',
		supportsTemperature: false,
		reasoning: 'medium',
	},

	'claude-sonnet-5': {
		name: 'claude-sonnet-5',
		id: 'claude-sonnet-5',
		openRouterId: 'anthropic/claude-sonnet-5',
		provider: 'anthropic',
		supportsTemperature: false,
		reasoning: 'low',
	},

	'claude-haiku-4-5': {
		name: 'claude-haiku-4-5',
		id: 'claude-haiku-4-5',
		openRouterId: 'anthropic/claude-haiku-4.5',
		provider: 'anthropic',
		// Anthropic takes no temperature while the model thinks.
		supportsTemperature: false,
		reasoning: 'low',
		thinkingBudget: 1024,
	},

	// Google models
	'gemini-3.8-flash': {
		name: 'gemini-3.8-flash',
		id: 'gemini-3.8-flash',
		openRouterId: 'google/gemini-3.8-flash',
		provider: 'google',
		supportsTemperature: false,
		reasoning: 'low',
	},

	// OpenAI models
	'gpt-5.6-sol': {
		name: 'gpt-5.6-sol',
		id: 'gpt-5.6-sol',
		openRouterId: 'openai/gpt-5.6-sol',
		provider: 'openai',
		supportsTemperature: false,
		reasoning: 'medium',
	},

	'gpt-5.6-terra': {
		name: 'gpt-5.6-terra',
		id: 'gpt-5.6-terra',
		openRouterId: 'openai/gpt-5.6-terra',
		provider: 'openai',
		supportsTemperature: false,
		reasoning: 'high',
	},

	'gpt-5.6-luna': {
		name: 'gpt-5.6-luna',
		id: 'gpt-5.6-luna',
		openRouterId: 'openai/gpt-5.6-luna',
		provider: 'openai',
		supportsTemperature: false,
		reasoning: 'medium',
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
