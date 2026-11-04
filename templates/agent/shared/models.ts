/**
 * The models the agent can use, as pi-ai `provider/id` refs. pi-ai's catalog supplies each model's
 * details, such as its API, context window and reasoning support.
 */
export const AGENT_MODELS = [
	'anthropic/claude-opus-5',
	'anthropic/claude-sonnet-5',
	'anthropic/claude-haiku-4-5',
	'google/gemini-3.8-flash',
	'openai/gpt-5.6-sol',
	'openai/gpt-5.6-terra',
	'openai/gpt-5.6-luna',
] as const

export type AgentModelName = (typeof AGENT_MODELS)[number]

export const DEFAULT_MODEL_NAME: AgentModelName = 'anthropic/claude-sonnet-5'

/**
 * Check if a string is a valid AgentModelName.
 */
export function isValidModelName(value: string | undefined): value is AgentModelName {
	return AGENT_MODELS.includes(value as AgentModelName)
}
