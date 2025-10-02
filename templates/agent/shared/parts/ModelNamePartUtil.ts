import { AgentModelName } from '../../worker/models'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface ModelNamePart extends BasePromptPart<'modelName'> {
	name: AgentModelName
}

export class ModelNamePartUtil extends PromptPartUtil<ModelNamePart> {
	static override type = 'modelName' as const

	/**
	 * Get the specified model name for the request.
	 */
	override getPart(request: AgentRequest): ModelNamePart {
		return {
			type: 'modelName',
			name: request.modelName,
		}
	}

	/**
	 * Use the specified model name for this request.
	 */
	override getModelName(part: ModelNamePart) {
		return part.name
	}
}
