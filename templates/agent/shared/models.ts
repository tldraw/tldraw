export const DEFAULT_MODEL_NAME = 'claude-4.5-sonnet'

export type AgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS
export type AgentModelProvider = 'openai' | 'anthropic' | 'google'

export interface AgentModelDefinition {
	name: AgentModelName
	id: string
	provider: AgentModelProvider

	// Overrides the default thinking behavior for that provider
	thinking?: boolean
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

export const AGENT_MODEL_DEFINITIONS = {
	// Strongly recommended
	'claude-4.5-sonnet': {
		name: 'claude-4.5-sonnet',
		id: 'claude-sonnet-4-5',
		provider: 'anthropic',
	},

	// Recommended
	'claude-4-sonnet': {
		name: 'claude-4-sonnet',
		id: 'claude-sonnet-4-0',
		provider: 'anthropic',
	},

	// Recommended
	'claude-3.5-sonnet': {
		name: 'claude-3.5-sonnet',
		id: 'claude-3-5-sonnet-latest',
		provider: 'anthropic',
	},

	// Recommended
	// 'gemini-2.5-flash': {
	// 	name: 'gemini-2.5-flash',
	// 	id: 'gemini-2.5-flash',
	// 	provider: 'google',
	// },

	// Not recommended
	// 'gemini-2.5-pro': {
	// 	name: 'gemini-2.5-pro',
	// 	id: 'gemini-2.5-pro',
	// 	provider: 'google',
	// 	thinking: true,
	// },

	// Not recommended
	// 'gpt-5': {
	// 	name: 'gpt-5',
	// 	id: 'gpt-5-2025-08-07',
	// 	provider: 'openai',
	// },

	// Mildly recommended
	// 'gpt-4.1': {
	// 	name: 'gpt-4.1',
	// 	id: 'gpt-4.1-2025-04-14',
	// 	provider: 'openai',
	// },

	// Mildly recommended
	// 'gpt-4o': {
	// 	name: 'gpt-4o',
	// 	id: 'gpt-4o',
	// 	provider: 'openai',
	// },
} as const
