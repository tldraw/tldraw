import {
	AgentModelName,
	AgentPrompt,
	DEFAULT_MODEL_NAME,
	ModelNamePart,
} from '@tldraw/fairy-shared'

/**
 * Get the selected model name from a prompt.
 */
export function getModelName(prompt: AgentPrompt): AgentModelName {
	for (const part of Object.values(prompt)) {
		if (part.type === 'modelName') {
			return (part as ModelNamePart).name
		}
	}

	return DEFAULT_MODEL_NAME
}
