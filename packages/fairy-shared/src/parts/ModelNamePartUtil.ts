import { AgentHelpers } from '../AgentHelpers'
import { AgentModelName } from '../models'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil, PromptPartUtilConstructor } from './PromptPartUtil'

export interface ModelNamePart extends BasePromptPart<'modelName'> {
	name: AgentModelName
}

export class ModelNamePartUtil extends PromptPartUtil<ModelNamePart> {
	static override type = 'modelName' as const

	/**
	 * Get the specified model name for the request.
	 */
	override getPart(
		request: AgentRequest,
		helpers: AgentHelpers,
		parts: PromptPartUtilConstructor['type'][]
	): ModelNamePart {
		if (!parts.includes('modelName')) {
			return {
				type: 'modelName',
				name: request.modelName,
			}
		}

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
