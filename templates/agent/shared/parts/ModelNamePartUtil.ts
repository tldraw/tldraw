import { Editor } from 'tldraw'
import { AgentModelName } from '../../worker/models'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface ModelNamePart extends BasePromptPart<'modelName'> {
	name: AgentModelName
}

export class ModelNamePartUtil extends PromptPartUtil<ModelNamePart> {
	static override type = 'modelName' as const

	override getPart(_editor: Editor, request: AgentRequest): ModelNamePart {
		return {
			type: 'modelName',
			name: request.modelName,
		}
	}
}
