import { AgentModelName, DEFAULT_MODEL_NAME, isValidModelName } from './models'
import { AgentPrompt } from './types/AgentPrompt'
import { getPromptPartDefinition } from './types/PromptPart'

export function getModelName(prompt: AgentPrompt): AgentModelName {
	for (const part of Object.values(prompt)) {
		const definition = getPromptPartDefinition(part.type)

		if (definition.getModelName) {
			const modelName = definition.getModelName(part)
			// Ignore unknown model names (e.g. from an older client whose stored
			// selection no longer exists) and fall through to the default so the
			// request doesn't throw.
			if (modelName && isValidModelName(modelName)) return modelName
		}
	}

	return DEFAULT_MODEL_NAME
}
