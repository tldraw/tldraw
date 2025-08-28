import { AgentModelName } from '../../worker/models'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class UserSelectedModelNamePartUtil extends PromptPartUtil<AgentModelName> {
	static override type = 'modelName' as const

	override async getPart(options: AgentPromptOptions) {
		return options.request.modelName
	}

	override getModelName(part: AgentModelName, _prompt: AgentPrompt) {
		return part
	}
}
