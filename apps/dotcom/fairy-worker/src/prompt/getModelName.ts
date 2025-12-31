import {
	AgentModelName,
	AgentPrompt,
	getDefaultModelName,
	ModelNamePart,
} from '@tldraw/fairy-shared'

/**
 * Get the selected model name from a prompt.
 */
export function getModelName(
	prompt: AgentPrompt,
	env?: {
		FAIRY_MODEL?: string
		IS_LOCAL?: string
	}
): AgentModelName {
	if (env?.IS_LOCAL) {
		// Only look at the model name part if we're in local mode.
		for (const part of Object.values(prompt)) {
			if (part.type === 'modelName') {
				return (part as ModelNamePart).name
			}
		}
	}

	return getDefaultModelName(env)
}
