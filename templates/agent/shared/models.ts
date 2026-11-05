export type AgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS
export type AgentModelProvider = 'openai' | 'anthropic' | 'google'

/**
 * How much the model reasons before it answers. The AI SDK maps it to each provider's own setting,
 * and rounds it down to the nearest level a model supports.
 */
export type AgentReasoning = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface AgentModelDefinition {
	name: string
	provider: AgentModelProvider
	/** The provider's own model id. */
	id: string
	/** The model's id on OpenRouter, used when the worker has an `OPENROUTER_API_KEY`. */
	openRouterId: string
	/** Omit to use the provider's default. */
	reasoning?: AgentReasoning
}

export const AGENT_MODEL_DEFINITIONS = {
	'claude-opus-5': {
		name: 'claude-opus-5',
		provider: 'anthropic',
		id: 'claude-opus-5',
		openRouterId: 'anthropic/claude-opus-5',
		reasoning: 'medium',
	},
	'claude-sonnet-5': {
		name: 'claude-sonnet-5',
		provider: 'anthropic',
		id: 'claude-sonnet-5',
		openRouterId: 'anthropic/claude-sonnet-5',
		reasoning: 'low',
	},
	'claude-haiku-4-5': {
		name: 'claude-haiku-4-5',
		provider: 'anthropic',
		id: 'claude-haiku-4-5',
		openRouterId: 'anthropic/claude-haiku-4.5',
		reasoning: 'low',
	},
	'gemini-3.8-flash': {
		name: 'gemini-3.8-flash',
		provider: 'google',
		id: 'gemini-3.8-flash',
		openRouterId: 'google/gemini-3.8-flash',
		reasoning: 'low',
	},
	'gpt-5.6-sol': {
		name: 'gpt-5.6-sol',
		provider: 'openai',
		id: 'gpt-5.6-sol',
		openRouterId: 'openai/gpt-5.6-sol',
		reasoning: 'medium',
	},
	'gpt-5.6-terra': {
		name: 'gpt-5.6-terra',
		provider: 'openai',
		id: 'gpt-5.6-terra',
		openRouterId: 'openai/gpt-5.6-terra',
		reasoning: 'high',
	},
	'gpt-5.6-luna': {
		name: 'gpt-5.6-luna',
		provider: 'openai',
		id: 'gpt-5.6-luna',
		openRouterId: 'openai/gpt-5.6-luna',
	},
} as const satisfies Record<string, AgentModelDefinition>

export const DEFAULT_MODEL_NAME: AgentModelName = 'claude-sonnet-5'

export function isValidModelName(value: string | undefined): value is AgentModelName {
	return !!value && value in AGENT_MODEL_DEFINITIONS
}

export function getAgentModelDefinition(modelName: AgentModelName): AgentModelDefinition {
	return AGENT_MODEL_DEFINITIONS[modelName]
}
