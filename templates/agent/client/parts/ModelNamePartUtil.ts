import { DEFAULT_MODEL_NAME } from '../../shared/models'
import { ModelNamePart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const ModelNamePartUtil = registerPromptPartUtil(
	class ModelNamePartUtil extends PromptPartUtil<ModelNamePart> {
		static override type = 'modelName' as const

		override getPart(_request: AgentRequest): ModelNamePart {
			return {
				type: 'modelName',
				modelName: this.agent.modelName.getModelName() ?? DEFAULT_MODEL_NAME,
			}
		}
	}
)
