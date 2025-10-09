import { getPromptPartUtilsRecord } from '../AgentUtils'
import { AgentPrompt } from '../types/AgentPrompt'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../models'

/**
 * Get the selected model name from a prompt.
 */
export function getModelName(prompt: AgentPrompt): AgentModelName {
	const utils = getPromptPartUtilsRecord()

	for (const part of Object.values(prompt)) {
		const util = utils[part.type]
		if (!util) continue
		const modelName = util.getModelName(part)
		if (modelName) return modelName
	}

	return DEFAULT_MODEL_NAME
}
