import { AgentRequest, DEFAULT_MODEL_NAME, ModelNamePart } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export class ModelNamePartUtil extends PromptPartUtil<ModelNamePart> {
	static override type = 'modelName' as const

	override getPart(_request: AgentRequest): ModelNamePart {
		const selectedModel = this.agent.fairyApp.getModelSelection()
		const modelName = selectedModel ?? DEFAULT_MODEL_NAME

		return {
			type: 'modelName',
			name: modelName,
		}
	}
}
