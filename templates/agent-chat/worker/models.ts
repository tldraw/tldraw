export type TLAgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS
export type TLAgentModelProvider = 'openai' | 'anthropic'

export interface TLAgentModelDefinition {
	id: string
	provider: TLAgentModelProvider
}

export function getTLAgentModelDefinition(modelName: TLAgentModelName): TLAgentModelDefinition {
	const definition = AGENT_MODEL_DEFINITIONS[modelName]
	if (!definition) {
		throw new Error(`Model ${modelName} not found`)
	}
	return definition
}

const AGENT_MODEL_DEFINITIONS = {
	'gpt-4o': {
		id: 'gpt-4o',
		provider: 'openai',
	},
	'claude-4-sonnet': {
		id: 'claude-sonnet-4-20250514',
		provider: 'anthropic',
	},
} as const
