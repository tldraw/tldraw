import { AgentModelName, DEFAULT_MODEL_NAME } from '../../shared/models'
import { getPromptPartDefinition } from '../../shared/schema/PromptPartRegistry'
import { AgentPrompt } from '../../shared/types/AgentPrompt'

/**
 * Get the selected model name from a prompt using shared definitions.
 */
export function getModelName(prompt: AgentPrompt): AgentModelName {
	for (const part of Object.values(prompt)) {
		const definition = getPromptPartDefinition(part.type)

		// Check if this definition provides a model name
		if (definition.getModelName) {
			const modelName = definition.getModelName(part as any)
			if (modelName) return modelName
		}
	}

	return DEFAULT_MODEL_NAME
}
