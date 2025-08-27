import { AgentModelName } from '../../worker/models'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class ModelNamePartUtil extends PromptPartUtil<AgentModelName> {
	static override type = 'modelName' as const

	override async getPart(options: AgentPromptOptions) {
		return options.request.modelName
	}
}
