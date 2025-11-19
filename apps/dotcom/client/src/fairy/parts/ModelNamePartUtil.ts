import { AgentRequest, DEFAULT_MODEL_NAME, ModelNamePart } from '@tldraw/fairy-shared'
import { $fairyModelSelection } from '../FairyModelSelection'
import { PromptPartUtil } from './PromptPartUtil'

export class ModelNamePartUtil extends PromptPartUtil<ModelNamePart> {
	static override type = 'modelName' as const

	override getPart(_request: AgentRequest): ModelNamePart {
		const selectedModel = $fairyModelSelection.get()
		const modelName = selectedModel ?? DEFAULT_MODEL_NAME

		return {
			type: 'modelName',
			name: modelName,
		}
	}
}
