import { AgentModelName, DEFAULT_MODEL_NAME, isValidModelName } from '../../shared/models'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { getPromptPartDefinition } from '../../shared/types/PromptPart'

/**
 * Get the selected model name from a prompt using shared definitions.
 */
export function getModelName(prompt: AgentPrompt): AgentModelName {
	for (const part of Object.values(prompt)) {
		const definition = getPromptPartDefinition(part.type)

		// Check if this definition provides a model name
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
