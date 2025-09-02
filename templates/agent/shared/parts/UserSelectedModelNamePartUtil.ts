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
	 * For reviews, always use Sonnet, regardless of the request's choice.
	 * Feel free to change this behavior as desired!
	 */
	override getPart(request: AgentRequest): ModelNamePart {
		return {
			type: 'modelName',
			name: request.type === 'review' ? 'claude-4-sonnet' : request.modelName,
		}
	}

	/**
	 * Use the specified model name for this request.
	 */
	override getModelName(part: ModelNamePart) {
		return part.name
	}
}
