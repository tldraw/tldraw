import { getPromptPartUtilsRecord } from '../../shared/AgentUtils'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../models'

// TODO: This should be extended to return some kind of priority or method for selecting which model to use if there are multiple prompt parts overriding this. Right now, in getModelName.ts, we just return the first model name that is not null.

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
