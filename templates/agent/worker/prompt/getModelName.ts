import { AgentModelName, DEFAULT_MODEL_NAME, isValidModelName } from '../../shared/models'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { getPromptPartDefinition } from '../../shared/types/PromptPart'

export function getModelName(prompt: AgentPrompt): AgentModelName {
	for (const part of Object.values(prompt)) {
		const modelName = getPromptPartDefinition(part.type).getModelName?.(part)
		// Ignore unknown model names (e.g. from an older client whose stored selection
		// no longer exists) and fall through to the default so the request doesn't throw.
		if (modelName && isValidModelName(modelName)) return modelName
	}

	return DEFAULT_MODEL_NAME
}
