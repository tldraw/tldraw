export type AgentModelProvider = 'anthropic' | 'google' | 'openai'

/**
 * How much the model reasons before it answers. The AI SDK maps it to each provider's own setting,
 * and rounds it down to the nearest level a model supports.
 */
export type AgentReasoning = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface AgentModelOptions {
	/** Omit to use the provider's default. */
	reasoning?: AgentReasoning
	/** The model's id on OpenRouter, when it differs from the model's name. */
	openRouterId?: string
}

/**
 * The models in the model picker. Each name is a `provider/id` ref: the AI SDK's provider registry
 * resolves it, and OpenRouter takes it as the model's id unless `openRouterId` says otherwise.
 */
export const AGENT_MODELS = {
	'anthropic/claude-opus-5': { reasoning: 'medium' },
	'anthropic/claude-sonnet-5': { reasoning: 'low' },
	// Haiku thinks with a token budget, a share of its output limit. `minimal` is about 1,300.
	'anthropic/claude-haiku-4-5': {
		reasoning: 'minimal',
		openRouterId: 'anthropic/claude-haiku-4.5',
	},
	'google/gemini-3.8-flash': { reasoning: 'low' },
	'openai/gpt-5.6-sol': { reasoning: 'medium' },
	'openai/gpt-5.6-terra': { reasoning: 'high' },
	'openai/gpt-5.6-luna': {},
} as const satisfies Record<`${AgentModelProvider}/${string}`, AgentModelOptions>

export type AgentModelName = keyof typeof AGENT_MODELS

export const DEFAULT_MODEL_NAME: AgentModelName = 'anthropic/claude-sonnet-5'

export function isValidModelName(value: string | undefined): value is AgentModelName {
	return !!value && value in AGENT_MODELS
}
