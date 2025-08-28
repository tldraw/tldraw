import { PROMPT_PART_UTILS } from '../../shared/AgentUtils'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../models'

// TODO: This should be extended to return some kind of priority or method for selecting which model to use if there are multiple prompt parts overriding this. Right now, in getModelName.ts, we just return the first model name that is not null.

export function getModelName(prompt: AgentPrompt): AgentModelName {
	const utils = Object.fromEntries(PROMPT_PART_UTILS.map((v) => [v.type, new v()]))

	for (const type in prompt) {
		const util = utils[type]
		if (!util) continue
		const part = prompt[type]
		const modelName = util.getModelName(part, prompt)
		if (modelName) return modelName
	}

	return DEFAULT_MODEL_NAME
}
