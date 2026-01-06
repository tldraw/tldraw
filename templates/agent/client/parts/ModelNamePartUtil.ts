import { ModelNamePart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const ModelNamePartUtil = registerPromptPartUtil(
	class ModelNamePartUtil extends PromptPartUtil<ModelNamePart> {
		static override type = 'modelName' as const

		/**
		 * Get the specified model name for the request.
		 */
		override getPart(request: AgentRequest): ModelNamePart {
			return {
				type: 'modelName',
				modelName: request.modelName,
			}
		}

		/**
		 * Use the specified model name for this request.
		 */
		override getModelName(part: ModelNamePart) {
			return part.modelName
		}
	}
)
