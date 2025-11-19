export const DEFAULT_MODEL_NAME = 'claude-4.5-sonnet' as const

export type AgentModelProvider = 'openai' | 'anthropic' | 'google'

export interface AgentModelDefinition {
	name: AgentModelName
	id: string
	provider: AgentModelProvider
	displayName?: string

	// Overrides the default thinking behavior for that provider
	thinking?: boolean
}

export const AGENT_MODEL_DEFINITIONS = {
	'claude-4.5-sonnet': {
		name: 'claude-4.5-sonnet',
		id: 'claude-sonnet-4-5',
		provider: 'anthropic',
	},

	'claude-4.5-haiku': {
		name: 'claude-4.5-haiku',
		id: 'claude-haiku-4-5',
		provider: 'anthropic',
		displayName: '(not great, breaks schema) claude-4.5-haiku',
	},

	'gemini-3-pro-preview': {
		name: 'gemini-3-pro-preview',
		id: 'gemini-3-pro-preview',
		provider: 'google',
		displayName: 'gemini-3-pro',
	},

	'gemini-2.5-pro': {
		name: 'gemini-2.5-pro',
		id: 'gemini-2.5-pro',
		provider: 'google',
		thinking: true,
		displayName: "(doesn't work yet) gemini-2.5-pro",
	},

	'gemini-2.5-flash': {
		name: 'gemini-2.5-flash',
		id: 'gemini-2.5-flash',
		provider: 'google',
	},

	'gpt-5.1': {
		name: 'gpt-5.1',
		id: 'gpt-5.1',
		provider: 'openai',
	},

	'gpt-5-mini': {
		name: 'gpt-5-mini',
		id: 'gpt-5-mini-2025-08-07',
		provider: 'openai',
		displayName: '(not great, freezes) gpt-5-mini',
	},
} as const

export type AgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS
