export const DEFAULT_MODEL_NAME = 'claude-4-sonnet'

export type AgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS
export type AgentModelProvider = 'openai' | 'anthropic' | 'google'

export interface AgentModelDefinition {
	name: AgentModelName
	id: string
	provider: AgentModelProvider

	// Overrides the default thinking behavior for that provider
	thinking?: boolean
}

export function getTLAgentModelDefinition(modelName: AgentModelName): AgentModelDefinition {
	const definition = AGENT_MODEL_DEFINITIONS[modelName]
	if (!definition) {
		throw new Error(`Model ${modelName} not found`)
	}
	return definition
}

export const AGENT_MODEL_DEFINITIONS = {
	'claude-4-sonnet': {
		name: 'claude-4-sonnet',
		id: 'claude-sonnet-4-0',
		provider: 'anthropic',
	},
	'claude-3.7-sonnet': {
		name: 'claude-3.7-sonnet',
		id: 'claude-3-7-sonnet-latest',
		provider: 'anthropic',
	},
	'claude-3.5-sonnet': {
		name: 'claude-3.5-sonnet',
		id: 'claude-3-5-sonnet-latest',
		provider: 'anthropic',
	},
	'claude-3.5-haiku': {
		name: 'claude-3.5-haiku',
		id: 'claude-3-5-haiku-latest',
		provider: 'anthropic',
	},
	'gemini-2.5-flash': {
		name: 'gemini-2.5-flash',
		id: 'gemini-2.5-flash',
		provider: 'google',
	},
	'gemini-2.5-flash-lite': {
		name: 'gemini-2.5-flash-lite',
		id: 'gemini-2.5-flash-lite-preview-06-17',
		provider: 'google',
	},
	'gemini-2.5-pro': {
		name: 'gemini-2.5-pro',
		id: 'gemini-2.5-pro',
		provider: 'google',
		thinking: true,
	},
	'gpt-4.1': {
		name: 'gpt-4.1',
		id: 'gpt-4.1-2025-04-14',
		provider: 'openai',
	},
	'gpt-4.1-mini': {
		name: 'gpt-4.1-mini',
		id: 'gpt-4.1-mini-2025-04-14',
		provider: 'openai',
	},
	'gpt-4o': {
		name: 'gpt-4o',
		id: 'gpt-4o',
		provider: 'openai',
	},
} as const
